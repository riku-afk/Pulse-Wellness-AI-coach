import { Response, NextFunction } from 'express';
import { AuthedRequest } from './auth.middleware';
import { getAdminDb } from '../config/firebase-admin';

/**
 * Premium gate for cloud AI (the free plan runs AI on-device).
 *
 * Inert unless ENFORCE_AI_PLAN=true, so it can ship ahead of the
 * subscription/paywall work without changing behavior. When enforced,
 * non-premium users get 402 UPGRADE_REQUIRED and the app falls back to the
 * on-device model.
 *
 * Reads `plan` from the user doc — the subscription flow (e.g. RevenueCat
 * webhook) is responsible for setting plan: 'premium' server-side. Never
 * trust a plan claim sent by the client.
 */
export async function requirePremiumForCloudAi(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
    if (process.env.ENFORCE_AI_PLAN !== 'true') {
        next();
        return;
    }

    const db = getAdminDb();
    if (!db || !req.uid) {
        // Fail open: requireAuth is the security gate; this one is business logic.
        next();
        return;
    }

    try {
        const snap = await db.collection('users').doc(req.uid).get();
        if (snap.data()?.plan === 'premium') {
            next();
            return;
        }
        res.status(402).json({ error: 'UPGRADE_REQUIRED' });
    } catch (e) {
        console.warn('[Plan] Plan check failed — allowing request:', e);
        next();
    }
}
