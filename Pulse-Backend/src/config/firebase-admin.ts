import * as admin from 'firebase-admin';

let initialized = false;

function init(): boolean {
    if (initialized) return true;

    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json) {
        console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled');
        return false;
    }

    try {
        const serviceAccount = JSON.parse(json);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        initialized = true;
        console.log('[FCM] Firebase Admin SDK initialized');
        return true;
    } catch (e) {
        console.error('[FCM] Failed to initialize Firebase Admin SDK:', e);
        return false;
    }
}

export function getAdminDb(): admin.firestore.Firestore | null {
    return init() ? admin.firestore() : null;
}

export function getMessaging(): admin.messaging.Messaging | null {
    return init() ? admin.messaging() : null;
}
