import { Router, Request, Response } from 'express';
import {
    getNotificationsREST,
    markAllReadREST,
    checkAndNotifyUsers,
} from '../services/notification/notification.service';
import { getAdminDb } from '../config/firebase-admin';

const router = Router();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// POST /api/v1/notifications/token
// Register or update the device FCM token for a user + set notificationsEnabled: true.
// Uses Admin SDK for the Firestore write so it never fails due to an expired user token.
router.post('/token', async (req: Request, res: Response) => {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
        res.status(400).json({ error: 'userId and fcmToken are required' });
        return;
    }

    const db = getAdminDb();
    if (!db) {
        console.error('[Notifications] Admin SDK not available — cannot register FCM token');
        res.status(503).json({ error: 'Notification service unavailable' });
        return;
    }

    try {
        await db.collection('users').doc(userId).set(
            { fcmToken, notificationsEnabled: true },
            { merge: true },
        );
        console.log(`[Notifications] FCM token registered for user ${userId}`);
        res.json({ message: 'FCM token registered' });
    } catch (e) {
        console.error(`[Notifications] Failed to register FCM token for ${userId}:`, e);
        res.status(500).json({ error: 'Failed to register FCM token' });
    }
});

// PATCH /api/v1/notifications/preferences
// Toggle notifications on or off
router.patch('/preferences', async (req: Request, res: Response) => {
    const { userId, notificationsEnabled } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!userId || notificationsEnabled === undefined) {
        res.status(400).json({ error: 'userId and notificationsEnabled are required' });
        return;
    }

    try {
        const response = await fetch(
            `${FIRESTORE_BASE_URL}/users/${userId}?updateMask.fieldPaths=notificationsEnabled`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: {
                        notificationsEnabled: { booleanValue: Boolean(notificationsEnabled) },
                    },
                }),
            },
        );

        if (!response.ok) {
            const err = await response.json() as { error?: { message?: string } };
            res.status(400).json({ error: err.error?.message || 'Failed to update preferences' });
            return;
        }

        res.json({ message: 'Notification preferences updated', notificationsEnabled });
    } catch {
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// GET /api/v1/notifications?userId=
// Fetch the user's recent notifications (newest first, max 30)
router.get('/', async (req: Request, res: Response) => {
    const { userId } = req.query as { userId?: string };
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!userId) {
        res.status(400).json({ error: 'userId query param is required' });
        return;
    }

    try {
        const notifications = await getNotificationsREST(userId, token ?? '');
        const unreadCount = notifications.filter(n => !n.isRead).length;
        res.json({ notifications, unreadCount });
    } catch {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// PATCH /api/v1/notifications/mark-read
// Mark all notifications as read for a user
router.patch('/mark-read', async (req: Request, res: Response) => {
    const { userId } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
    }

    try {
        await markAllReadREST(userId, token ?? '');
        res.json({ message: 'All notifications marked as read' });
    } catch {
        res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
});

// GET /api/v1/notifications/debug?userId=
// Temporary: diagnose exactly why notifications aren't being sent for a user.
// Remove once notifications are confirmed working.
router.get('/debug', async (req: Request, res: Response) => {
    const { userId } = req.query as { userId?: string };
    if (!userId) {
        res.status(400).json({ error: 'userId query param is required' });
        return;
    }

    const report: Record<string, unknown> = {};

    // 1. Check Firebase Admin SDK
    const db = getAdminDb();
    report.adminSdkInitialized = !!db;

    if (!db) {
        res.json({ ...report, verdict: 'FIREBASE_SERVICE_ACCOUNT_JSON is not set on Railway — notifications disabled' });
        return;
    }

    // 2. Check user document
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            res.json({ ...report, verdict: 'User document not found in Firestore' });
            return;
        }

        const data = userDoc.data()!;
        report.notificationsEnabled = data.notificationsEnabled ?? null;
        report.fcmTokenPresent = !!data.fcmToken;
        report.fcmTokenPrefix = data.fcmToken ? String(data.fcmToken).slice(0, 20) + '...' : null;

        // 3. Check if user has pulsed today (PH time)
        const phOffset = 8 * 60 * 60 * 1000;
        const todayPH = new Date(Date.now() + phOffset).toISOString().split('T')[0];
        report.todayPH = todayPH;

        const pulseDoc = await db.collection('users').doc(userId)
            .collection('dailyPulse').doc(todayPH).get();
        report.hasPulsedToday = pulseDoc.exists;

        // 4. Check if already notified today
        const morningSnap = await db.collection('users').doc(userId)
            .collection('notifications')
            .where('type', '==', 'morning_reminder')
            .where('phDate', '==', todayPH)
            .limit(1)
            .get();
        report.morningNotificationSentToday = !morningSnap.empty;

        const eveningSnap = await db.collection('users').doc(userId)
            .collection('notifications')
            .where('type', '==', 'evening_reminder')
            .where('phDate', '==', todayPH)
            .limit(1)
            .get();
        report.eveningNotificationSentToday = !eveningSnap.empty;

        // 5. Verdict
        if (!data.notificationsEnabled) {
            report.verdict = 'notificationsEnabled is false or missing — FCM token was never registered from the app';
        } else if (!data.fcmToken) {
            report.verdict = 'notificationsEnabled=true but fcmToken is missing';
        } else if (pulseDoc.exists) {
            report.verdict = 'User already pulsed today — notifications correctly skipped';
        } else {
            report.verdict = 'User is eligible for notifications. If cron fired and no push arrived, the FCM token may be stale/invalid.';
        }

        res.json(report);
    } catch (e) {
        res.status(500).json({ ...report, error: String(e) });
    }
});

// POST /api/v1/notifications/test-send?userId=
// Temporary: manually trigger the morning notification check right now.
router.post('/test-send', async (req: Request, res: Response) => {
    const { type } = req.body as { type?: 'morning_reminder' | 'evening_reminder' };
    if (type !== 'morning_reminder' && type !== 'evening_reminder') {
        res.status(400).json({ error: 'type must be morning_reminder or evening_reminder' });
        return;
    }
    try {
        await checkAndNotifyUsers(type);
        res.json({ message: `${type} check triggered — check Railway logs for details` });
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
});

export default router;
