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
        prompt = `You are a friendly and supportive wellness AI assistant.
The user has shared the following health data:
- Hours of sleep: ${pulseData!.sleepDuration} hours
- Mood level: ${pulseData!.moodLevel}/5 (${pulseData!.moodLabel})

Respond empathetically and positively. Include actionable tips for today. Keep advice concise, friendly, and non-judgmental. If sleep or mood is low, provide gentle suggestions to improve. If both are high, encourage maintaining good habits.
`;
    } else {
        prompt = `You are a friendly and supportive AI wellness assistant. Help the user with their wellness questions. Be concise, friendly, and helpful. Do not reference or invent any health data.
`;
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
