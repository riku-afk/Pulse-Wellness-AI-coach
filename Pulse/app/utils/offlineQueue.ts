import AsyncStorage from '@react-native-async-storage/async-storage';
import { logDailyPulse, DailyPulseLog } from '../services/pulse';
import { saveJournalEntry } from '../services/journal';
import { clearCacheByPrefix } from './cache';
import { useAppStore } from '../store/appStore';

/**
 * Offline write queue for the two writes a user would hate to lose:
 * daily pulse check-ins and journal entries.
 *
 * Failed-due-to-network saves are enqueued (stamped with the PH date they were
 * written, so a next-day sync lands on the right day) and flushed on app boot,
 * on foreground, and whenever flushQueue() is called. One write per
 * user+kind+date — the latest wins, matching the server's per-date documents.
 */

const QUEUE_KEY = 'pulse_offline_queue';
const MAX_ATTEMPTS = 5; // non-network failures per item before we give up

export type QueuedWrite =
    | { kind: 'pulse'; userId: string; date: string; payload: DailyPulseLog; attempts?: number }
    | { kind: 'journal'; userId: string; date: string; payload: { content: string; moodTag: number | null; date: string; aiReflection?: string }; attempts?: number };

/** True for fetch-level connectivity failures (RN: "Network request failed", web: "Failed to fetch"). */
export function isNetworkError(e: unknown): boolean {
    return e instanceof TypeError
        || (e instanceof Error && /network request failed|failed to fetch/i.test(e.message));
}

async function readQueue(): Promise<QueuedWrite[]> {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        return raw ? (JSON.parse(raw) as QueuedWrite[]) : [];
    } catch {
        return [];
    }
}

async function writeQueue(queue: QueuedWrite[]): Promise<void> {
    try {
        if (queue.length === 0) await AsyncStorage.removeItem(QUEUE_KEY);
        else await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
        // Best-effort — worst case the item is retried or lost on next read.
    }
}

export async function enqueueWrite(item: QueuedWrite): Promise<void> {
    const queue = await readQueue();
    const rest = queue.filter(w =>
        !(w.kind === item.kind && w.userId === item.userId && w.date === item.date));
    rest.push(item);
    await writeQueue(rest);
}

export async function getQueueLength(): Promise<number> {
    return (await readQueue()).length;
}

let flushing = false;

/**
 * Replay queued writes in order. Stops at the first network failure (still
 * offline); drops items the server keeps rejecting. No-op when signed out,
 * already flushing, or the queue is empty.
 */
export async function flushQueue(): Promise<void> {
    if (flushing) return;
    flushing = true;
    try {
        const queue = await readQueue();
        if (queue.length === 0) return;

        const { token } = useAppStore.getState();
        if (!token) return;

        const remaining: QueuedWrite[] = [];
        const syncedUsers = new Set<string>();

        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            try {
                if (item.kind === 'pulse') {
                    await logDailyPulse(item.userId, token, item.payload);
                } else {
                    await saveJournalEntry(item.userId, token, item.payload);
                }
                syncedUsers.add(item.userId);
            } catch (e) {
                if (isNetworkError(e)) {
                    // Still offline — keep this item and everything after it, in order.
                    remaining.push(...queue.slice(i));
                    break;
                }
                const attempts = (item.attempts ?? 0) + 1;
                if (attempts < MAX_ATTEMPTS) {
                    remaining.push({ ...item, attempts });
                } else {
                    console.warn(`[OfflineQueue] Dropping ${item.kind} write for ${item.date} after ${attempts} failed attempts:`, e);
                }
            }
        }

        await writeQueue(remaining);

        if (syncedUsers.size > 0) {
            // Synced writes invalidate cached summaries/lists for those users.
            for (const uid of syncedUsers) {
                clearCacheByPrefix(`pulseSummary_${uid}`);
                clearCacheByPrefix(`recentPulse_${uid}`);
                clearCacheByPrefix(`journal_${uid}`);
            }
            useAppStore.getState().showToast('Offline entries synced');
        }
    } finally {
        flushing = false;
    }
}
