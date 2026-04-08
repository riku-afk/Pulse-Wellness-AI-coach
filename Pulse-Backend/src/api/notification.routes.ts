import { Router, Request, Response } from 'express';
import {
    getNotificationsREST,
    markAllReadREST,
} from '../services/notification/notification.service';

const router = Router();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// POST /api/v1/notifications/token
// Register or update the device FCM token for a user + set notificationsEnabled: true
router.post('/token', async (req: Request, res: Response) => {
    const { userId, fcmToken } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!userId || !fcmToken) {
        res.status(400).json({ error: 'userId and fcmToken are required' });
        return;
    }

    try {
        const response = await fetch(
            `${FIRESTORE_BASE_URL}/users/${userId}?updateMask.fieldPaths=fcmToken&updateMask.fieldPaths=notificationsEnabled`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: {
                        fcmToken: { stringValue: fcmToken },
                        notificationsEnabled: { booleanValue: true },
                    },
                }),
            },
        );

        if (!response.ok) {
            const err = await response.json() as { error?: { message?: string } };
            res.status(400).json({ error: err.error?.message || 'Failed to register token' });
            return;
        }

        res.json({ message: 'FCM token registered' });
    } catch {
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

export default router;
