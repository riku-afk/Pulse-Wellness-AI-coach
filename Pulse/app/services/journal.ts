import { apiJson } from './apiClient';

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
    data: {
        content: string;
        moodTag: number | null;
        date?: string;
        /** Reflection generated on-device (free plan) — backend stores it instead of calling cloud AI. */
        aiReflection?: string;
    }
): Promise<JournalEntry> {
    return apiJson<JournalEntry>('/api/v1/journal', {
        method: 'POST',
        body: { userId, ...data },
        token,
        errorMessage: 'Failed to save journal entry',
    });
}

export async function getJournalEntries(
    userId: string,
    token: string,
    page: number = 1
): Promise<JournalPage> {
    return apiJson<JournalPage>(
        `/api/v1/journal?userId=${encodeURIComponent(userId)}&page=${page}`,
        { token, errorMessage: 'Failed to fetch journal entries' },
    );
}

export async function searchJournalEntries(
    userId: string,
    token: string,
    q: string
): Promise<JournalEntry[]> {
    const data = await apiJson<{ entries: JournalEntry[] }>(
        `/api/v1/journal/search?userId=${encodeURIComponent(userId)}&q=${encodeURIComponent(q)}`,
        { token, errorMessage: 'Search failed' },
    );
    return data.entries;
}

export async function getJournalEntry(
    userId: string,
    token: string,
    date: string
): Promise<JournalEntry | null> {
    return apiJson<JournalEntry | null>(
        `/api/v1/journal/${date}?userId=${encodeURIComponent(userId)}`,
        { token, errorMessage: 'Failed to fetch journal entry' },
    );
}
