import { getAdminDb, getMessaging } from '../../config/firebase-admin';
import * as admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export type NotificationType = 'morning_reminder' | 'evening_reminder';

export interface StoredNotification {
    id: string;
    title: string;
    body: string;
    type: NotificationType;
    createdAt: string;
    isRead: boolean;
}

// ─── Store a notification in Firestore via Admin SDK ──────────────────────────

export async function storeNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
): Promise<void> {
    const db = getAdminDb();
    if (!db) return;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 days

    const phOffset = 8 * 60 * 60 * 1000;
    const phDate = new Date(now.getTime() + phOffset).toISOString().split('T')[0]; // PH date YYYY-MM-DD

    await db.collection('users').doc(userId).collection('notifications').add({
        title,
        body,
        type,
        isRead: false,
        phDate,
        createdAt: admin.firestore.Timestamp.fromDate(now),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });
}

// ─── Send FCM push notification ───────────────────────────────────────────────

export async function sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
): Promise<void> {
    const messaging = getMessaging();
    if (!messaging) return;

    await messaging.send({
        token: fcmToken,
        notification: { title, body },
        android: {
            priority: 'high',
            notification: { channelId: 'pulse_reminders', sound: 'default' },
        },
        apns: {
            payload: { aps: { sound: 'default', badge: 1 } },
        },
    });
}

// ─── Check if a notification of this type was already sent to the user today ──

async function hasNotifiedToday(userId: string, type: NotificationType): Promise<boolean> {
    const db = getAdminDb();
    if (!db) return false;

    const phOffset = 8 * 60 * 60 * 1000;
    const todayStr = new Date(Date.now() + phOffset).toISOString().split('T')[0];

    const snap = await db
        .collection('users').doc(userId)
        .collection('notifications')
        .where('type', '==', type)
        .where('phDate', '==', todayStr)
        .limit(1)
        .get();

    return !snap.empty;
}

// ─── Check if a user has logged a pulse today (PH time) ──────────────────────

async function hasPulsedToday(userId: string): Promise<boolean> {
    const db = getAdminDb();
    if (!db) return true; // Assume pulsed — don't spam if SDK unavailable

    const phOffset = 8 * 60 * 60 * 1000;
    const phNow = new Date(Date.now() + phOffset);
    const todayStr = phNow.toISOString().split('T')[0]; // YYYY-MM-DD

    const doc = await db
        .collection('users').doc(userId)
        .collection('dailyPulse').doc(todayStr)
        .get();

    return doc.exists;
}

// ─── Core: notify all eligible users ─────────────────────────────────────────

export async function checkAndNotifyUsers(type: NotificationType): Promise<void> {
    const db = getAdminDb();
    if (!db) {
        console.warn('[Cron] Admin DB not available, skipping notification run');
        return;
    }

    console.log(`[Cron] Running ${type} notification check`);

    const usersSnapshot = await db.collection('users')
        .where('notificationsEnabled', '==', true)
        .get();

    if (usersSnapshot.empty) {
        console.log('[Cron] No users with notifications enabled');
        return;
    }

    let sent = 0;
    let skipped = 0;

    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const data = userDoc.data();

        const fcmToken: string | undefined = data.fcmToken;
        if (!fcmToken) { skipped++; continue; }

        // Skip if already notified today (guards against duplicate sends on server restart)
        const alreadyNotified = await hasNotifiedToday(userId, type);
        if (alreadyNotified) { skipped++; continue; }

        // Don't send if user already logged pulse today
        const hasPulsed = await hasPulsedToday(userId);
        if (hasPulsed) { skipped++; continue; }

        const firstName: string = data.firstName ?? 'there';
        const middleName: string = data.middleName ? ` ${data.middleName}` : '';
        const lastName: string = data.lastName ? ` ${data.lastName}` : '';
        const fullName = `${firstName}${middleName}${lastName}`.trim();

        let title: string;
        let body: string;

        if (type === 'morning_reminder') {
            title = `Good morning, ${fullName}! ☀️`;
            body = "Don't forget to log your daily pulse check-in and start your day right.";
        } else {
            title = `Hey ${fullName}, how's your day going? 🌙`;
            body = "You haven't checked in yet today. Take a moment to log your pulse before the day ends.";
        }

        try {
            await sendPushNotification(fcmToken, title, body);
            await storeNotification(userId, title, body, type);
            sent++;
        } catch (e) {
            console.error(`[Cron] Failed to notify user ${userId}:`, e);
            skipped++;
        }
    }

    console.log(`[Cron] ${type} done — sent: ${sent}, skipped: ${skipped}`);
}

// ─── Cleanup notifications older than 14 days ─────────────────────────────────

export async function cleanupExpiredNotifications(): Promise<void> {
    const db = getAdminDb();
    if (!db) return;

    console.log('[Cron] Running notification cleanup');

    const now = admin.firestore.Timestamp.now();
    const usersSnapshot = await db.collection('users').get();
    let deleted = 0;

    for (const userDoc of usersSnapshot.docs) {
        const expiredSnap = await db
            .collection('users').doc(userDoc.id)
            .collection('notifications')
            .where('expiresAt', '<=', now)
            .get();

        const batch = db.batch();
        expiredSnap.docs.forEach(d => batch.delete(d.ref));
        if (!expiredSnap.empty) {
            await batch.commit();
            deleted += expiredSnap.size;
        }
    }

    console.log(`[Cron] Cleanup done — deleted ${deleted} expired notifications`);
}

// ─── Fetch notifications for a user (REST — uses user's own token) ────────────

export async function getNotificationsREST(
    userId: string,
    token: string,
): Promise<StoredNotification[]> {
    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'notifications' }],
            orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
            limit: 30,
        },
    };

    const response = await fetch(
        `${FIRESTORE_BASE_URL}/users/${userId}:runQuery`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(queryBody),
        },
    );

    if (!response.ok) return [];

    const results = await response.json() as Array<{ document?: { name?: string; fields?: Record<string, any> } }>;

    return results
        .filter(r => r.document?.fields)
        .map(r => {
            const f = r.document!.fields!;
            const name = r.document!.name ?? '';
            const id = name.split('/').pop() ?? '';
            const createdAt = f.createdAt?.timestampValue ?? f.createdAt?.stringValue ?? '';
            return {
                id,
                title: f.title?.stringValue ?? '',
                body: f.body?.stringValue ?? '',
                type: (f.type?.stringValue ?? 'morning_reminder') as NotificationType,
                isRead: f.isRead?.booleanValue ?? false,
                createdAt,
            };
        });
}

// ─── Mark all notifications as read (REST) ───────────────────────────────────

export async function markAllReadREST(
    userId: string,
    token: string,
): Promise<void> {
    const db = getAdminDb();
    if (!db) return;

    const snap = await db
        .collection('users').doc(userId)
        .collection('notifications')
        .where('isRead', '==', false)
        .get();

    if (snap.empty) return;

    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit();
}
