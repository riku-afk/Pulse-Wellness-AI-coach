import { Request, Response, NextFunction } from 'express';
import { AuthedRequest } from './auth.middleware';

/**
 * Simple in-memory fixed-window rate limiter, keyed by verified uid when
 * present (run after requireAuth) and IP otherwise. Good enough for a single
 * Railway instance; swap for a store-backed limiter if we ever scale out.
 */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
    const hits = new Map<string, { count: number; resetAt: number }>();

    return (req: Request, res: Response, next: NextFunction): void => {
        const now = Date.now();

        // Prune expired entries occasionally so the map can't grow unbounded.
        if (hits.size > 1000) {
            for (const [k, v] of hits) {
                if (now >= v.resetAt) hits.delete(k);
            }
        }

        const key = (req as AuthedRequest).uid ?? req.ip ?? 'unknown';
        const entry = hits.get(key);

        if (!entry || now >= entry.resetAt) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            next();
            return;
        }

        if (entry.count >= max) {
            res.status(429).json({ error: 'Too many requests — try again shortly' });
            return;
        }

        entry.count++;
        next();
    };
}
