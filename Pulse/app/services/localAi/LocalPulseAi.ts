import { Platform } from 'react-native';
import type { LlamaContext } from 'llama.rn';
import { MODEL_PATH, getModelState, deleteModel as deleteModelFile } from './modelManager';
import type { PulseData, ConversationMessage, WeekEntry } from '../PulseAi';

/**
 * On-device AI engine (free plan): runs the downloaded GGUF via llama.rn and
 * exposes the exact streaming callback interface PulseAi.ts uses, so screens
 * can't tell which brain is talking.
 *
 * Prompts mirror Pulse-Backend/src/services/ai/ai.service.ts — keep the two
 * in sync when editing either.
 */

export function isLocalAiReady(): boolean {
    return Platform.OS !== 'web' && getModelState().status === 'ready';
}

// ---------------------------------------------------------------------------
// Context lifecycle — load the model once, keep it warm, release on delete
// ---------------------------------------------------------------------------

let context: LlamaContext | null = null;
let initPromise: Promise<LlamaContext> | null = null;

async function getContext(): Promise<LlamaContext> {
    if (context) return context;
    if (!initPromise) {
        // Lazy require: llama.rn is a native module — importing it at bundle
        // evaluation time would break the web build.
        const { initLlama } = require('llama.rn') as typeof import('llama.rn');
        initPromise = initLlama({
            model: MODEL_PATH.replace('file://', ''),
            n_ctx: 4096,
            n_gpu_layers: 99, // Metal on iOS; ignored on CPU-only Android
        }).then(c => {
            context = c;
            return c;
        }).catch(e => {
            initPromise = null;
            throw e;
        });
    }
    return initPromise;
}

export async function releaseLocalAi(): Promise<void> {
    const c = context;
    context = null;
    initPromise = null;
    if (c) await c.release().catch(() => {});
}

/** Delete the model file, releasing the inference context first. */
export async function deleteLocalModel(): Promise<void> {
    await releaseLocalAi();
    await deleteModelFile();
}

// ---------------------------------------------------------------------------
// Generation core
// ---------------------------------------------------------------------------

async function streamLocal(
    prompt: string,
    onChunk: (text: string) => void,
    onDone: (() => void) | undefined,
    signal: AbortSignal | undefined,
    nPredict: number,
): Promise<void> {
    const ctx = await getContext();
    if (signal?.aborted) return;

    const onAbort = () => { ctx.stopCompletion().catch(() => {}); };
    signal?.addEventListener('abort', onAbort);
    try {
        // messages mode applies the GGUF's built-in chat template (Gemma format).
        await ctx.completion(
            {
                messages: [{ role: 'user', content: prompt }],
                n_predict: nPredict,
                temperature: 0.7,
            },
            (data) => {
                if (data.token && !signal?.aborted) onChunk(data.token);
            },
        );
        if (!signal?.aborted) onDone?.();
    } finally {
        signal?.removeEventListener('abort', onAbort);
    }
}

// ---------------------------------------------------------------------------
// Prompts — mirrored from the backend
// ---------------------------------------------------------------------------

function buildChatPrompt(
    userMessage: string,
    pulseData: PulseData | undefined,
    conversationHistory: ConversationMessage[],
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

export interface JournalContextEntry {
    date: string;
    moodTag: number | null;
    excerpt: string;
}

function formatJournalContext(journalEntries: JournalContextEntry[]): string {
    const lines = journalEntries.map(j => {
        const mood = j.moodTag != null ? ` (mood ${j.moodTag}/10)` : '';
        return `${j.date}${mood}: "${j.excerpt}"`;
    }).join('\n');

    return `

The user has also shared their journal entries from this week (they opted in to this):
${lines}

When journal themes are relevant, weave them in naturally — e.g. "you mentioned feeling stretched at work twice this week". Reference feelings and themes, never quote long passages back verbatim. If the journal reveals what's driving a mood or sleep pattern in the numbers, connect the two.`;
}

function buildWeeklyAssessmentPrompt(
    weekHistory: WeekEntry[],
    followUpQuestion?: string,
    previousAssessment?: string,
    journalEntries: JournalContextEntry[] = [],
): string {
    const dataLines = weekHistory.map(e => {
        const d = new Date(e.date + 'T00:00:00Z');
        const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
        return `${day}: Mood ${e.moodLevel}/5 (${e.moodLabel}), Sleep ${e.sleepDuration}h, Pulse Score ${e.pulseScore}`;
    }).join('\n');

    const journalContext = journalEntries.length > 0 ? formatJournalContext(journalEntries) : '';

    if (followUpQuestion && previousAssessment) {
        return `You are Pulse, a personal AI wellness coach. You previously delivered this weekly assessment:

${previousAssessment}${journalContext}

The user has a follow-up question: "${followUpQuestion}"

Answer directly and specifically in 2-4 sentences. Reference the data where relevant. Sound like a caring, knowledgeable coach — warm but grounded. No markdown symbols.

Pulse:`;
    }

    return `You are Pulse, a personal AI wellness coach. Analyze the user's week of health data and deliver a concise, insightful wellness assessment.

Week data (newest first):
${dataLines}${journalContext}

Write the assessment using exactly these four labeled sections. Each section is a single short paragraph. No markdown symbols (no **, ##, or bullet points). Plain text only.

Overall: [2 sentences summing up the week based on the numbers — mood trajectory, sleep adequacy, overall pattern]

Mood: [2 sentences on the mood pattern — what the data shows about consistency, highs, lows, and what might be driving them]

Sleep: [2 sentences on sleep quality — whether it met the 7-9h target, how it correlates with mood if notable]

Your Focus This Week: [1 specific, actionable recommendation grounded in the actual data — not generic advice]

Guidelines:
- Be specific to the actual numbers, not generic wellness tips
- Sound like a caring coach who genuinely reviewed the data
- 150-200 words total

Pulse:`;
}

// ---------------------------------------------------------------------------
// Public API — same signatures as the cloud paths in PulseAi.ts
// ---------------------------------------------------------------------------

export function localStreamAIResponse(
    userMessage: string,
    pulseData: PulseData | undefined,
    conversationHistory: ConversationMessage[],
    onChunk: (text: string) => void,
    onDone?: () => void,
    signal?: AbortSignal,
): Promise<void> {
    return streamLocal(buildChatPrompt(userMessage, pulseData, conversationHistory), onChunk, onDone, signal, 256);
}

/** One warm sentence (<20 words) reflecting the journal entry back — mirrors the backend prompt. */
export async function localGenerateReflection(content: string, moodTag: number | null): Promise<string> {
    const moodNote = moodTag != null
        ? ` The writer rated their mood ${moodTag}/10 today.`
        : '';
    const prompt = `You are a thoughtful wellness journal companion. Read this journal entry and write exactly ONE short, warm sentence (under 20 words) that reflects something meaningful back to the writer. Do not give advice — just mirror an insight or feeling from what they wrote.${moodNote}

Journal entry:
"${content}"

One-line reflection:`;

    const ctx = await getContext();
    const result = await ctx.completion({
        messages: [{ role: 'user', content: prompt }],
        n_predict: 64,
        temperature: 0.7,
    });
    // Single sentence only — strip wrapping quotes and anything past a line break.
    return result.text.trim().split('\n')[0].replace(/^["']|["']$/g, '').trim();
}

export function localStreamWeeklyAssessment(
    weekHistory: WeekEntry[],
    onChunk: (text: string) => void,
    onDone?: () => void,
    signal?: AbortSignal,
    followUpQuestion?: string,
    previousAssessment?: string,
    journalEntries: JournalContextEntry[] = [],
): Promise<void> {
    return streamLocal(
        buildWeeklyAssessmentPrompt(weekHistory, followUpQuestion, previousAssessment, journalEntries),
        onChunk,
        onDone,
        signal,
        512,
    );
}
