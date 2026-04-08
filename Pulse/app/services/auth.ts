const BACKEND_URL = 'https://pulse-wellness-ai-coach-production.up.railway.app';

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
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
    }

    return data;
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Login failed');
    }

    return data;
}
export async function checkProfileComplete(userId: string, token: string): Promise<boolean> {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/profile/check/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to check profile');
    }

    return data.profileCompleted as boolean;
}

export async function updateProfile(userId: string, token: string, profile: UserProfile): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/profile/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
    }
}

export async function saveProfile(userId: string, token: string, profile: UserProfile): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, ...profile }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile');
    }
}

export async function getProfile(userId: string, token: string): Promise<UserProfile> {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/profile/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile');
    }

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
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/profile/${userId}/avatar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ base64, mimeType }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to upload avatar');
    }

    return data.photoURL as string;
}

export interface UserPrefs {
    lastPulseCheckedAt: number | null;
    hasSeenLanding: boolean;
}

/** Reads lastPulseCheckedAt and hasSeenLanding from the user's Firestore document. */
export async function getUserPrefs(userId: string, token: string): Promise<UserPrefs> {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/profile/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user prefs');
    }

    const fields = data.profile?.fields;
    return {
        lastPulseCheckedAt: fields?.lastPulseCheckedAt?.integerValue
            ? parseInt(fields.lastPulseCheckedAt.integerValue, 10)
            : null,
        hasSeenLanding: fields?.hasSeenLanding?.booleanValue === true,
    };
}

/** Partially updates lastPulseCheckedAt and/or hasSeenLanding in Firestore (fire-and-forget safe). */
export async function updateUserPrefs(
    userId: string,
    token: string,
    prefs: { lastPulseCheckedAt?: number; hasSeenLanding?: boolean }
): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/profile/${userId}/prefs`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(prefs),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to update user prefs');
    }
}

export async function logout(): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'User logged out' }),
    });

    if (!response.ok) {
        throw new Error('Logout failed');
    }
}
export async function resetPassword(email: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
    }
}