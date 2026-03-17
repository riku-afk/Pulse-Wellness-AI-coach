const BACKEND_URL = 'http://localhost:5000';

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
