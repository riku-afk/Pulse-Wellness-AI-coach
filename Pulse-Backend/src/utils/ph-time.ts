// The Philippines is UTC+8 year-round (no DST), so a fixed offset is safe.
// This is the single home for PH time math — don't re-derive the offset elsewhere.
export const PH_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

/** PH calendar date as YYYY-MM-DD. */
export function phDateString(now: number = Date.now()): string {
    return new Date(now + PH_UTC_OFFSET_MS).toISOString().split('T')[0];
}

/** Hour of day in PH time (0–23). */
export function phHour(now: number = Date.now()): number {
    return new Date(now + PH_UTC_OFFSET_MS).getUTCHours();
}
