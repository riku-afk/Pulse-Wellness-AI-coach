import { apiJson, apiFetch } from './apiClient';

// Re-exported so existing imports (e.g. app/index.tsx) keep working.
export { refreshIdToken, refreshSession, getValidToken } from './apiClient';

export interface AuthUser {
    token: string;
    refreshToken: string;
    userId: string;
    email: string;
}

export interface UserProfile {
    firstName: string;
    middleName?: string;
    lastName: string;
    age: number;
    gender: string;
    photoURL?: string;
}

export async function registerUser(email: string, password: string): Promise<AuthUser> {
    return apiJson<AuthUser>('/api/v1/auth/register', {
        method: 'POST',
        body: { email, password },
        auth: false,
        errorMessage: 'Registration failed',
    });
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
    return apiJson<AuthUser>('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
        errorMessage: 'Login failed',
    });
}

export async function checkProfileComplete(userId: string, token: string): Promise<boolean> {
    const data = await apiJson<{ profileCompleted: boolean }>(
        `/api/v1/auth/profile/check/${userId}`,
        { token, errorMessage: 'Failed to check profile' },
    );
    return data.profileCompleted;
}

export async function updateProfile(userId: string, token: string, profile: UserProfile): Promise<void> {
    await apiJson(`/api/v1/auth/profile/${userId}`, {
        method: 'PATCH',
        body: profile,
        token,
        errorMessage: 'Failed to update profile',
    });
}

export async function saveProfile(userId: string, token: string, profile: UserProfile): Promise<void> {
    await apiJson('/api/v1/auth/profile', {
        method: 'POST',
        body: { userId, ...profile },
        token,
        errorMessage: 'Failed to save profile',
    });
}

// Firestore REST document shape returned by the backend profile routes.
interface FirestoreProfileResponse {
    profile?: {
        fields?: Record<string, {
            stringValue?: string;
            integerValue?: string;
            booleanValue?: boolean;
        }>;
    };
}

export async function getProfile(userId: string, token: string): Promise<UserProfile> {
    const data = await apiJson<FirestoreProfileResponse>(`/api/v1/auth/profile/${userId}`, {
        token,
        errorMessage: 'Failed to fetch profile',
    });

    // Backend returns { profile: <Firestore REST document> }
    // Firestore REST format: { fields: { fieldName: { stringValue/integerValue/... } } }
    const fields = data.profile?.fields;
    return {
        firstName: fields?.firstName?.stringValue || '',
        middleName: fields?.middleName?.stringValue,
        lastName: fields?.lastName?.stringValue || '',
        age: parseInt(fields?.age?.integerValue || '0', 10),
        gender: fields?.gender?.stringValue || '',
        photoURL: fields?.photoURL?.stringValue || undefined,
    };
}

/** Upload a profile photo as base64 to Firebase Storage and save the URL to Firestore. */
export async function uploadAvatar(
    userId: string,
    token: string,
    base64: string,
    mimeType: string
): Promise<string> {
    const data = await apiJson<{ photoURL: string }>(`/api/v1/auth/profile/${userId}/avatar`, {
        method: 'POST',
        body: { base64, mimeType },
        token,
        errorMessage: 'Failed to upload avatar',
    });
    return data.photoURL;
}

export type AiPlan = 'local' | 'cloud';

export interface UserPrefs {
    lastPulseCheckedAt: number | null;
    /** User opted in to the AI reading journal entries for weekly assessments. */
    journalAiEnabled: boolean;
    /** Daily reminder push toggle (default on). */
    notificationsEnabled: boolean;
    /** PH-time hour (0-23) for the morning check-in reminder. */
    morningReminderHour: number;
    /** PH-time hour (0-23) for the evening check-in reminder. */
    eveningReminderHour: number;
    /** AI engine choice made after login; null = not chosen yet (route to choose-plan). */
    aiPlan: AiPlan | null;
}

/** Reads behavioural prefs (lastPulseCheckedAt, AI settings, reminder hours) from the user's Firestore document. */
export async function getUserPrefs(userId: string, token: string): Promise<UserPrefs> {
    const data = await apiJson<FirestoreProfileResponse>(`/api/v1/auth/profile/${userId}`, {
        token,
        errorMessage: 'Failed to fetch user prefs',
    });

    const fields = data.profile?.fields;
    const hour = (raw: string | undefined, fallback: number): number => {
        const n = raw ? parseInt(raw, 10) : NaN;
        return Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback;
    };
    return {
        lastPulseCheckedAt: fields?.lastPulseCheckedAt?.integerValue
            ? parseInt(fields.lastPulseCheckedAt.integerValue, 10)
            : null,
        journalAiEnabled: fields?.journalAiEnabled?.booleanValue === true,
        notificationsEnabled: fields?.notificationsEnabled?.booleanValue !== false, // default on
        morningReminderHour: hour(fields?.morningReminderHour?.integerValue, 7),
        eveningReminderHour: hour(fields?.eveningReminderHour?.integerValue, 18),
        aiPlan: fields?.aiPlan?.stringValue === 'local' || fields?.aiPlan?.stringValue === 'cloud'
            ? fields.aiPlan.stringValue as AiPlan
            : null,
    };
}

/** Partially updates behavioural prefs in Firestore (fire-and-forget safe). */
export async function updateUserPrefs(
    userId: string,
    token: string,
    prefs: {
        lastPulseCheckedAt?: number;
        journalAiEnabled?: boolean;
        morningReminderHour?: number;
        eveningReminderHour?: number;
        aiPlan?: AiPlan;
    }
): Promise<void> {
    await apiJson(`/api/v1/auth/profile/${userId}/prefs`, {
        method: 'PATCH',
        body: prefs,
        token,
        errorMessage: 'Failed to update user prefs',
    });
}

/** Clears this device's FCM token server-side. The backend derives the user from the ID token. */
export async function logout(token: string): Promise<void> {
    const response = await apiFetch('/api/v1/auth/logout', { method: 'POST', token });
    if (!response.ok) {
        throw new Error('Logout failed');
    }
}

export async function resetPassword(email: string): Promise<void> {
    await apiJson('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: { email },
        auth: false,
        errorMessage: 'Failed to send password reset email',
    });
}
