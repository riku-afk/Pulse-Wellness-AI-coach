import { Platform } from 'react-native';
import { BACKEND_URL } from './config';
import { getValidToken, refreshSession } from './apiClient';
import { useAppStore } from '../store/appStore';
import { isLocalAiReady, localStreamAIResponse, localStreamWeeklyAssessment, JournalContextEntry } from './localAi/LocalPulseAi';
import { getJournalEntries } from './journal';

/** Free plan with the model downloaded → run inference on-device. */
function useLocalEngine(): boolean {
    return useAppStore.getState().useLocalAi && isLocalAiReady();
}

/**
 * Journal context for on-device assessments (the cloud path fetches its own
 * server-side). Only when the user opted in; best-effort — offline or a fetch
 * failure just means an assessment without journal themes.
 */
async function getLocalJournalContext(): Promise<JournalContextEntry[]> {
    const { journalAiEnabled, userId, token } = useAppStore.getState();
    if (!journalAiEnabled || !userId || !token) return [];
    try {
        const page = await getJournalEntries(userId, token, 1);
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return page.entries
            .filter(e => e.date >= cutoff && e.content.trim().length > 0)
            .slice(0, 7)
            .map(e => ({
                date: e.date,
                moodTag: e.moodTag,
                excerpt: e.content.slice(0, 400),
            }));
    } catch {
        return [];
    }
}

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
    authToken: string | null,
    onChunk: (text: string) => void,
    onDone: (() => void) | undefined,
    signal: AbortSignal | undefined,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);

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
            // HTTP errors (401 etc.) don't fire onerror — surface them explicitly,
            // otherwise the stream silently completes with no content.
            if (xhr.status >= 400) {
                settle(new Error(`Request failed: ${xhr.status}`));
                return;
            }
            const newData = xhr.responseText.slice(cursor);
            cursor = xhr.responseText.length;
            const done = processSSEChunk(newData, buffer, onChunk, onDone, (msg) => {
                settle(new Error(msg));
            });
            if (done) settle();
        };

        xhr.onload = () => {
            if (xhr.status >= 400) {
                settle(new Error(`Request failed: ${xhr.status}`));
                return;
            }
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
    authToken: string | null,
    onChunk: (text: string) => void,
    onDone: (() => void) | undefined,
    signal: AbortSignal | undefined,
): Promise<void> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
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

async function doStream(
    url: string,
    body: string,
    onChunk: (text: string) => void,
    onDone: (() => void) | undefined,
    signal: AbortSignal | undefined,
): Promise<void> {
    // React Native's Fetch doesn't support SSE streaming on native (response.body unreliable).
    // XHR onprogress is the only reliable path on Android/iOS.
    const run = (tok: string | null) =>
        Platform.OS === 'web'
            ? streamViaFetch(url, body, tok, onChunk, onDone, signal)
            : streamViaXHR(url, body, tok, onChunk, onDone, signal);

    // The AI endpoints require auth; refresh proactively when the token is stale.
    const authToken = await getValidToken();
    try {
        return await run(authToken);
    } catch (err) {
        // A 401 happens before any SSE chunk is sent, so a retry can't duplicate output.
        if (err instanceof Error && err.message.includes('Request failed: 401')) {
            const fresh = await refreshSession();
            if (fresh) return run(fresh);
        }
        throw err;
    }
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
    if (useLocalEngine()) {
        return localStreamAIResponse(userMessage, pulseData, conversationHistory, onChunk, onDone, signal);
    }
    const body = JSON.stringify({ userMessage, pulseData, conversationHistory });
    try {
        return await doStream(`${BACKEND_URL}/api/v1/ai/chat`, body, onChunk, onDone, signal);
    } catch (err) {
        // 402 = cloud AI is premium-only; fall back to the on-device model.
        // A 402 fires before any SSE chunk, so no output is duplicated.
        if (err instanceof Error && err.message.includes('Request failed: 402') && isLocalAiReady()) {
            return localStreamAIResponse(userMessage, pulseData, conversationHistory, onChunk, onDone, signal);
        }
        throw err;
    }
}

export async function streamWeeklyAssessment(
    weekHistory: WeekEntry[],
    onChunk: (text: string) => void,
    onDone?: () => void,
    signal?: AbortSignal,
    followUpQuestion?: string,
    previousAssessment?: string,
): Promise<void> {
    if (useLocalEngine()) {
        const journal = await getLocalJournalContext();
        return localStreamWeeklyAssessment(weekHistory, onChunk, onDone, signal, followUpQuestion, previousAssessment, journal);
    }
    const body = JSON.stringify({ weekHistory, followUpQuestion, previousAssessment });
    try {
        return await doStream(`${BACKEND_URL}/api/v1/ai/assess`, body, onChunk, onDone, signal);
    } catch (err) {
        if (err instanceof Error && err.message.includes('Request failed: 402') && isLocalAiReady()) {
            const journal = await getLocalJournalContext();
            return localStreamWeeklyAssessment(weekHistory, onChunk, onDone, signal, followUpQuestion, previousAssessment, journal);
        }
        throw err;
    }
}
