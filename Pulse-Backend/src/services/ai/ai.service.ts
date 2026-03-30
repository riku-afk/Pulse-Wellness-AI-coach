import { GoogleGenerativeAI } from '@google/generative-ai';

export type AIProvider = 'ollama' | 'gemini';

export interface PulseData {
    sleepDuration: number;
    moodLevel: number;
    moodLabel: string;
}

export interface ConversationMessage {
    type: 'user' | 'ai';
    content: string;
}

interface OllamaStreamChunk {
    model: string;
    response: string;
    done: boolean;
}

// ---------------------------------------------------------------------------
// Prompt builder (shared between providers)
// ---------------------------------------------------------------------------

function buildPrompt(
    userMessage: string,
    pulseData: PulseData | undefined,
    conversationHistory: ConversationMessage[]
): string {
    const hasPulseData =
        pulseData !== undefined &&
        typeof pulseData.sleepDuration === 'number' &&
        typeof pulseData.moodLevel === 'number' &&
        typeof pulseData.moodLabel === 'string' &&
        pulseData.moodLabel.length > 0;

    let prompt: string;

    if (hasPulseData) {
        prompt = `You are Pulse, a warm and grounded AI wellness coach. Your role is to offer brief, human-sounding check-ins — not clinical advice.

    User data:
    - Sleep: ${pulseData!.sleepDuration}h (optimal is 7–9h)
    - Mood: ${pulseData!.moodLevel}/5 (${pulseData!.moodLabel})

    Tone & Style:
    - Open with a short, natural greeting ("Hey", "Hi there", "Morning")
    - Sound like a caring friend, not a health app
    - No emojis, or at most one used sparingly
    - Never mention you're an AI or explain your role
    - 2–4 sentences total

    Response Logic:
    - Low sleep (< 6h) → acknowledge tiredness gently, suggest 1 simple recovery action (e.g. a short nap, reduce screen time)
    - Low mood (≤ 2/5) → validate feelings without dramatizing, offer 1 grounding action (e.g. short walk, hydration, fresh air)
    - Both low → address mood first, weave in sleep briefly
    - Both okay/high → reinforce what's working, suggest one habit to sustain momentum
    - Avoid generic advice like "drink water" unless it genuinely fits the data

    Output format:
    [Greeting] + [1 personalized insight] + [1 actionable suggestion] + [optional: 1 natural question]
    Just write a natural, human response.`;

    } else if (!hasPulseData) {
        prompt = `You are Pulse, a warm and grounded AI wellness coach. The user hasn't logged any data yet.

    Tone & Style:
    - Open with a short, natural greeting
    - Sound approachable and calm — not salesy or overly enthusiastic
    - No emojis, or at most one
    - Never explain your role or mention you're an AI
    - 2–4 sentences total

    Response Logic:
    - Don't assume anything about the user's health or habits
    - Offer one simple, universally helpful wellness nudge (movement, rest, mindfulness, hydration)
    - Vary your advice — don't always default to the same tip
    - Optionally invite them to share how they're feeling (1 question max)
    - Always respond naturally to what the user says — never output format labels or placeholders

    IMPORTANT: You are in an active conversation. Reply directly to the user's latest message.
    Do NOT output format descriptions like "[Greeting] + [1 practical wellness tip]".
    Just write a natural, human response.`;

    } else {
        prompt = `You are Pulse, a warm and grounded AI wellness coach.

        Tone & Style:
        - Friendly, calm, and human — like a knowledgeable friend
        - Concise: answer in 2–5 sentences unless the question genuinely needs more
        - No emojis unless the user uses them first
        - Never fabricate health stats or invent user data

        Behavior:
        - Answer the user's wellness question directly and practically
        - If the question is vague, give a broadly useful answer and optionally ask one clarifying question
        - Stay grounded in realistic, evidence-based advice`;
    }

    if (conversationHistory.length > 0) {
        prompt += '\nConversation history:\n';
        for (const msg of conversationHistory) {
            prompt += `${msg.type === 'user' ? 'User' : 'Pulse'}: ${msg.content}\n`;
        }
    }

    prompt += `\nUser: ${userMessage}\nPulse:`;
    return prompt;
}

// ---------------------------------------------------------------------------
// Ollama provider
// ---------------------------------------------------------------------------

async function* streamOllama(prompt: string): AsyncGenerator<string> {
    const ollamaUrl = process.env.OLLAMA;
    const model = process.env.OLLAMA_MODEL ?? 'gemma3:1b';

    if (!ollamaUrl) throw new Error('OLLAMA env variable is not set');

    const response = await fetch(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt,
            stream: true,
            keep_alive: '5m',
            options: { temperature: 0.7, top_k: 40, top_p: 0.95 },
        }),
    });

    if (!response.ok) throw new Error(`Ollama request failed: ${response.status}`);
    if (!response.body) throw new Error('Ollama response body is null');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const chunk = JSON.parse(trimmed) as OllamaStreamChunk;
                if (chunk.response) yield chunk.response;
                if (chunk.done) return;
            }
        }

        if (buffer.trim()) {
            const chunk = JSON.parse(buffer.trim()) as OllamaStreamChunk;
            if (chunk.response) yield chunk.response;
        }
    } finally {
        reader.releaseLock();
    }
}

// ---------------------------------------------------------------------------
// Gemini provider
// ---------------------------------------------------------------------------

async function* streamGemini(prompt: string): AsyncGenerator<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';

    if (!apiKey) throw new Error('GEMINI_API_KEY env variable is not set');

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    const result = await geminiModel.generateContentStream(prompt);

    for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
    }
}

// ---------------------------------------------------------------------------
// Public entry point — delegates to the active provider
// ---------------------------------------------------------------------------

export async function* generateAIResponse(
    userMessage: string,
    pulseData?: PulseData,
    conversationHistory: ConversationMessage[] = []
): AsyncGenerator<string> {
    const provider = (process.env.AI_PROVIDER ?? 'ollama') as AIProvider;
    const prompt = buildPrompt(userMessage, pulseData, conversationHistory);

    if (provider === 'gemini') {
        yield* streamGemini(prompt);
    } else {
        yield* streamOllama(prompt);
    }
}
