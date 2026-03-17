const BACKEND_URL = 'http://localhost:5000';

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
    };
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