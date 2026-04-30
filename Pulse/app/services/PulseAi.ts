import { Platform } from 'react-native';

const BACKEND_URL = 'https://pulse-wellness-ai-coach-production.up.railway.app';

export interface PulseData {
    sleepDuration: number;
    moodLevel: number;
    moodLabel: string;
    moodEmojis: string
}

export interface ConversationMessage {
    type: 'user' | 'ai';
    content: string;
}

// ---------------------------------------------------------------------------
// Parse SSE lines and fire callbacks — shared by both transport paths
// ---------------------------------------------------------------------------
function processSSEChunk(
    rawChunk: string,
    buffer: { value: string },
    onChunk: (text: string) => void,
    onDone: (() => void) | undefined,
    onError: (msg: string) => void,
): boolean /* done */ {
    buffer.value += rawChunk;
    const lines = buffer.value.split('\n');
    buffer.value = lines.pop() ?? '';

    for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
            onDone?.();
            return true;
        }
        if (data === '[ERROR]') {
            onError('Stream error from server');
            return true;
        }
        if (data) {
            try {
                onChunk(JSON.parse(data));
            } catch {
                onChunk(data); // fallback for non-JSON chunks
            }
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// XHR-based streaming — works on Android/iOS (Hermes has no ReadableStream)
// ---------------------------------------------------------------------------
function streamViaXHR(
    url: string,
    body: string,
    onChunk: (text: string) => void,
    onDone: (() => void) | undefined,
    signal: AbortSignal | undefined,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');

        let cursor = 0;
        const buffer = { value: '' };
        let settled = false;

        const settle = (err?: Error) => {
            if (settled) return;
            settled = true;
            if (err) reject(err);
            else resolve();
        };

        xhr.onprogress = () => {
            const newData = xhr.responseText.slice(cursor);
            cursor = xhr.responseText.length;
            const done = processSSEChunk(newData, buffer, onChunk, onDone, (msg) => {
                settle(new Error(msg));
            });
            if (done) settle();
        };

        xhr.onload = () => {
            // Flush anything left after final onprogress
            if (cursor < xhr.responseText.length) {
                const newData = xhr.responseText.slice(cursor);
                processSSEChunk(newData, buffer, onChunk, onDone, (msg) => {
                    settle(new Error(msg));
                });
            }
            settle();
        };

        xhr.onerror = () => settle(new Error(`Request failed: ${xhr.status}`));

        if (signal) {
            signal.addEventListener('abort', () => {
                xhr.abort();
                settle(new Error('Aborted'));
            });
        }

        xhr.send(body);
    });
}

// ---------------------------------------------------------------------------
// Fetch-based streaming — works in browsers (web)
// ---------------------------------------------------------------------------
async function streamViaFetch(
    url: string,
    body: string,
    onChunk: (text: string) => void,
    onDone: (() => void) | undefined,
    signal: AbortSignal | undefined,
): Promise<void> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal,
    });

    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    if (!response.body) throw new Error('Response body is null');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const buffer = { value: '' };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const finished = processSSEChunk(chunk, buffer, onChunk, onDone, (msg) => {
                throw new Error(msg);
            });
            if (finished) return;
        }
    } finally {
        reader.releaseLock();
    }
}

function doStream(
    url: string,
    body: string,
    onChunk: (text: string) => void,
    onDone: (() => void) | undefined,
    signal: AbortSignal | undefined,
): Promise<void> {
    // React Native's Fetch doesn't support SSE streaming on native (response.body unreliable).
    // XHR onprogress is the only reliable path on Android/iOS.
    if (Platform.OS === 'web') {
        return streamViaFetch(url, body, onChunk, onDone, signal);
    }
    return streamViaXHR(url, body, onChunk, onDone, signal);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export interface WeekEntry {
    date: string;
    moodLevel: number;
    moodLabel: string;
    sleepDuration: number;
    pulseScore: number;
}

export async function streamAIResponse(
    userMessage: string,
    pulseData: PulseData | undefined,
    conversationHistory: ConversationMessage[],
    onChunk: (text: string) => void,
    onDone?: () => void,
    signal?: AbortSignal,
): Promise<void> {
    const body = JSON.stringify({ userMessage, pulseData, conversationHistory });
    return doStream(`${BACKEND_URL}/api/v1/ai/chat`, body, onChunk, onDone, signal);
}

export async function streamWeeklyAssessment(
    weekHistory: WeekEntry[],
    onChunk: (text: string) => void,
    onDone?: () => void,
    signal?: AbortSignal,
    followUpQuestion?: string,
    previousAssessment?: string,
): Promise<void> {
    const body = JSON.stringify({ weekHistory, followUpQuestion, previousAssessment });
    return doStream(`${BACKEND_URL}/api/v1/ai/assess`, body, onChunk, onDone, signal);
}
