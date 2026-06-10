const store: Record<string, { data: unknown; ts: number }> = {};
const TTL = 30 * 60 * 1000; // 30 minutes

export function getCache<T>(key: string): T | null {
    const entry = store[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > TTL) { delete store[key]; return null; }
    return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
    store[key] = { data, ts: Date.now() };
}

export function clearCache(key: string): void {
    delete store[key];
}

export function clearCacheByPrefix(prefix: string): void {
    for (const key of Object.keys(store)) {
        if (key.startsWith(prefix)) delete store[key];
    }
}
