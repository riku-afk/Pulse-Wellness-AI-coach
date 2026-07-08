import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Two-tier cache: synchronous in-memory reads backed by AsyncStorage so
 * last-known data survives app restarts (offline-first screens).
 *
 * Pages treat this as stale-while-revalidate: they render whatever getCache
 * returns immediately and always refetch in the background, so entries are
 * served up to MAX_AGE — if the network is down, old data beats no data.
 *
 * Call hydrateCache() once at app boot before the first screen renders.
 */

const PERSIST_PREFIX = 'pulse_cache:';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days — older entries are dropped

const store: Record<string, { data: unknown; ts: number }> = {};

export function getCache<T>(key: string): T | null {
    const entry = store[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > MAX_AGE) {
        clearCache(key);
        return null;
    }
    return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
    const entry = { data, ts: Date.now() };
    store[key] = entry;
    AsyncStorage.setItem(PERSIST_PREFIX + key, JSON.stringify(entry)).catch(() => {});
}

export function clearCache(key: string): void {
    delete store[key];
    AsyncStorage.removeItem(PERSIST_PREFIX + key).catch(() => {});
}

export function clearCacheByPrefix(prefix: string): void {
    for (const key of Object.keys(store)) {
        if (key.startsWith(prefix)) delete store[key];
    }
    AsyncStorage.getAllKeys()
        .then(keys => {
            const matches = keys.filter(k => k.startsWith(PERSIST_PREFIX + prefix));
            return matches.length ? AsyncStorage.multiRemove(matches) : undefined;
        })
        .catch(() => {});
}

let hydrated = false;

/** Load persisted entries into memory. Safe to call more than once. */
export async function hydrateCache(): Promise<void> {
    if (hydrated) return;
    hydrated = true;
    try {
        const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PERSIST_PREFIX));
        if (keys.length === 0) return;

        const pairs = await AsyncStorage.multiGet(keys);
        const now = Date.now();
        const expired: string[] = [];

        for (const [storageKey, raw] of pairs) {
            if (!raw) continue;
            try {
                const entry = JSON.parse(raw) as { data: unknown; ts: number };
                if (now - entry.ts > MAX_AGE) {
                    expired.push(storageKey);
                    continue;
                }
                const key = storageKey.slice(PERSIST_PREFIX.length);
                // Never clobber data written this session — it's fresher.
                if (!store[key]) store[key] = entry;
            } catch {
                expired.push(storageKey);
            }
        }

        if (expired.length) AsyncStorage.multiRemove(expired).catch(() => {});
    } catch {
        // Cache is best-effort — a failed hydration just means a cold start.
    }
}
