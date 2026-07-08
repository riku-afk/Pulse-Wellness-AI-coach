import { apiJson } from './apiClient';

export interface DailyPulseLog {
    moodLevel: number;
    moodLabel: string;
    sleepDuration: number;
    pulseScore?: number;
    /** YYYY-MM-DD; lets offline check-ins sync onto the day they were written. */
    date?: string;
}

export interface PulseSummary {
    avgSleep: number;
    totalSleepDebt: number;
    moodStability: 'High' | 'Medium' | 'Low';
    moodBars: number[];
    sleepBars: number[];
    debtDots: number[];
    hasData: boolean;
    streakDays: number;
    avgMood: number | null;
    daysLogged: number;
    avgMoodPrev: number | null;
    avgSleepPrev: number | null;
}

export interface RecentPulseEntry {
    date: string;
    moodLevel: number;
    moodLabel: string;
    sleepDuration: number;
    sleepDebt: number;
    pulseScore: number;
    aiSuggestion: string;
}

export interface PulseHistoryPage {
    entries: RecentPulseEntry[];
    hasMore: boolean;
    page: number;
}

export async function logDailyPulse(
    userId: string,
    token: string,
    data: DailyPulseLog
): Promise<void> {
    await apiJson('/api/v1/pulse/log', {
        method: 'POST',
        body: { userId, ...data },
        token,
        errorMessage: 'Failed to log daily pulse',
    });
}

export async function getPulseSummary(
    userId: string,
    token: string
): Promise<PulseSummary> {
    return apiJson<PulseSummary>(`/api/v1/pulse/${userId}/summary`, {
        token,
        errorMessage: 'Failed to fetch pulse summary',
    });
}

export async function getRecentPulse(
    userId: string,
    token: string,
    limit: number = 5
): Promise<RecentPulseEntry[]> {
    return apiJson<RecentPulseEntry[]>(`/api/v1/pulse/${userId}/recent?limit=${limit}`, {
        token,
        errorMessage: 'Failed to fetch recent pulse',
    });
}

export async function getPulseHistory(
    userId: string,
    token: string,
    page: number = 1
): Promise<PulseHistoryPage> {
    return apiJson<PulseHistoryPage>(`/api/v1/pulse/${userId}/history?page=${page}`, {
        token,
        errorMessage: 'Failed to fetch pulse history',
    });
}

export async function saveAiSuggestion(
    userId: string,
    token: string,
    date: string,
    aiSuggestion: string
): Promise<void> {
    await apiJson(`/api/v1/pulse/${userId}/ai/${date}`, {
        method: 'PATCH',
        body: { aiSuggestion },
        token,
        errorMessage: 'Failed to save AI suggestion',
    });
}
