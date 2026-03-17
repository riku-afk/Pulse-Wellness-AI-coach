const BACKEND_URL = 'http://localhost:5000';

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

export async function streamAIResponse(
    userMessage: string,
    pulseData: PulseData | undefined,
    conversationHistory: ConversationMessage[],
    onChunk: (text: string) => void,
    onDone?: () => void,
    signal?: AbortSignal
): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage, pulseData, conversationHistory }),
        signal,
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    if (!response.body) {
        throw new Error('Response body is null');
    }

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
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6);
                if (data === '[DONE]') {
                    onDone?.();
                    return;
                }
                if (data === '[ERROR]') {
                    throw new Error('Stream error from server');
                }
                if (data) {
                    onChunk(data);
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}
