import { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../config/firebase-admin';

// Request with the uid extracted from a verified Firebase ID token.
export interface AuthedRequest extends Request {
    uid?: string;
}

/**
 * Verifies the Firebase ID token in the Authorization header and attaches
 * the caller's uid to the request. Rejects with 401 when the token is
 * missing/invalid, 503 when the Admin SDK isn't configured (fail closed).
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        res.status(401).json({ error: 'Missing Authorization bearer token' });
        return;
    }

    const auth = getAdminAuth();
    if (!auth) {
        console.error('[Auth] Admin SDK not available — cannot verify ID tokens (set FIREBASE_SERVICE_ACCOUNT_JSON)');
        res.status(503).json({ error: 'Auth service unavailable' });
        return;
    }

    try {
        const decoded = await auth.verifyIdToken(token);
        req.uid = decoded.uid;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
