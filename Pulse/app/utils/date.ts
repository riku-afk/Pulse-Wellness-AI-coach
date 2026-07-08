/**
 * Philippines-local calendar date (UTC+8, no DST) as YYYY-MM-DD.
 * Matches how the backend keys dailyPulse and journal documents.
 */
export function phDateString(now: number = Date.now()): string {
    return new Date(now + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}
