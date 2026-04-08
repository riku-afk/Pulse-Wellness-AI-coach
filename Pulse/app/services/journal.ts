const BACKEND_URL = 'https://pulse-wellness-ai-coach-production.up.railway.app';

export interface JournalEntry {
    date: string;
    content: string;
    moodTag: number | null;
    createdAt: string;
    aiReflection: string | null;
}

export interface JournalPage {
    entries: JournalEntry[];
    hasMore: boolean;
    page: number;
}

export async function saveJournalEntry(
    userId: string,
    token: string,
    data: { content: string; moodTag: number | null; date?: string }
): Promise<JournalEntry> {
    const response = await fetch(`${BACKEND_URL}/api/v1/journal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, ...data }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Failed to save journal entry');
    return json as JournalEntry;
}

export async function getJournalEntries(
    userId: string,
    token: string,
    page: number = 1
): Promise<JournalPage> {
    const response = await fetch(
        `${BACKEND_URL}/api/v1/journal?userId=${encodeURIComponent(userId)}&page=${page}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Failed to fetch journal entries');
    return json as JournalPage;
}

export async function getJournalEntry(
    userId: string,
    token: string,
    date: string
): Promise<JournalEntry | null> {
    const response = await fetch(
        `${BACKEND_URL}/api/v1/journal/${date}?userId=${encodeURIComponent(userId)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Failed to fetch journal entry');
    return json as JournalEntry | null;
}
