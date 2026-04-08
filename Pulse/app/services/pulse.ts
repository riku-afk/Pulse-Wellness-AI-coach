const BACKEND_URL = 'https://pulse-wellness-ai-coach-production.up.railway.app';

export interface DailyPulseLog {
    moodLevel: number;
    moodLabel: string;
    sleepDuration: number;
    pulseScore?: number;
}

export interface PulseSummary {
    avgSleep: number;
    totalSleepDebt: number;
    moodStability: 'High' | 'Medium' | 'Low';
    moodBars: number[];
    sleepBars: number[];
    debtDots: number[];
    hasData: boolean;
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
    const response = await fetch(`${BACKEND_URL}/api/v1/pulse/log`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, ...data }),
    });

    const json = await response.json();

    if (!response.ok) {
        throw new Error(json.error || 'Failed to log daily pulse');
    }
}

export async function getPulseSummary(
    userId: string,
    token: string
): Promise<PulseSummary> {
    const response = await fetch(`${BACKEND_URL}/api/v1/pulse/${userId}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const json = await response.json();

    if (!response.ok) {
        throw new Error(json.error || 'Failed to fetch pulse summary');
    }

    return json as PulseSummary;
}

export async function getRecentPulse(
    userId: string,
    token: string
): Promise<RecentPulseEntry[]> {
    const response = await fetch(`${BACKEND_URL}/api/v1/pulse/${userId}/recent`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const json = await response.json();

    if (!response.ok) {
        throw new Error(json.error || 'Failed to fetch recent pulse');
    }

    return json as RecentPulseEntry[];
}

export async function getPulseHistory(
    userId: string,
    token: string,
    page: number = 1
): Promise<PulseHistoryPage> {
    const response = await fetch(`${BACKEND_URL}/api/v1/pulse/${userId}/history?page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const json = await response.json();

    if (!response.ok) {
        throw new Error(json.error || 'Failed to fetch pulse history');
    }

    return json as PulseHistoryPage;
}

export async function saveAiSuggestion(
    userId: string,
    token: string,
    date: string,
    aiSuggestion: string
): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/pulse/${userId}/ai/${date}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ aiSuggestion }),
    });

    if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || 'Failed to save AI suggestion');
    }
}
