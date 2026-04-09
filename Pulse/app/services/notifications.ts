const BACKEND_URL = 'https://pulse-wellness-ai-coach-production.up.railway.app';

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    type: 'morning_reminder' | 'evening_reminder';
    isRead: boolean;
    createdAt: string;
}

export interface NotificationsResponse {
    notifications: AppNotification[];
    unreadCount: number;
}

export async function registerFCMToken(
    userId: string,
    token: string,
    fcmToken: string,
): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/notifications/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, fcmToken }),
    });
    if (!response.ok) {
        const json = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `HTTP ${response.status}`);
    }
}

export async function setNotificationPreference(
    userId: string,
    token: string,
    notificationsEnabled: boolean,
): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/notifications/preferences`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, notificationsEnabled }),
    });
    if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || 'Failed to update notification preferences');
    }
}

export async function getNotifications(
    userId: string,
    token: string,
): Promise<NotificationsResponse> {
    const response = await fetch(
        `${BACKEND_URL}/api/v1/notifications?userId=${encodeURIComponent(userId)}`,
        { headers: { 'Authorization': `Bearer ${token}` } },
    );
    if (!response.ok) return { notifications: [], unreadCount: 0 };
    return response.json();
}

export async function markAllRead(
    userId: string,
    token: string,
): Promise<void> {
    await fetch(`${BACKEND_URL}/api/v1/notifications/mark-read`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
    });
}
