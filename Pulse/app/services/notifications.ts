import { apiJson, apiFetch } from './apiClient';

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
    // The backend derives the user from the verified ID token; userId is legacy.
    await apiJson('/api/v1/notifications/token', {
        method: 'POST',
        body: { userId, fcmToken },
        token,
    });
}

export async function setNotificationPreference(
    userId: string,
    token: string,
    notificationsEnabled: boolean,
): Promise<void> {
    await apiJson('/api/v1/notifications/preferences', {
        method: 'PATCH',
        body: { userId, notificationsEnabled },
        token,
        errorMessage: 'Failed to update notification preferences',
    });
}

export async function getNotifications(
    userId: string,
    token: string,
): Promise<NotificationsResponse> {
    const response = await apiFetch(
        `/api/v1/notifications?userId=${encodeURIComponent(userId)}`,
        { token },
    );
    if (!response.ok) return { notifications: [], unreadCount: 0 };
    return response.json();
}

export async function markAllRead(
    userId: string,
    token: string,
): Promise<void> {
    await apiFetch('/api/v1/notifications/mark-read', {
        method: 'PATCH',
        body: { userId },
        token,
    });
}
