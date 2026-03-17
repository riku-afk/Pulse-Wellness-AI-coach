import { Router, Request, Response } from 'express';

const router = Router();

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

interface FirestoreDocument {
    fields: Record<string, { stringValue?: string; integerValue?: string; booleanValue?: boolean; nullValue?: null }>;
}

interface FirebaseAuthResponse {
    idToken: string;
    email: string;
    refreshToken: string;
    expiresIn: string;
    localId: string;
    error?: { message: string };
}

router.post('/register', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const response = await fetch(`${FIREBASE_AUTH_URL}:signUp?key=${FIREBASE_WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });

        const data = await response.json() as FirebaseAuthResponse;

        if (!response.ok) {
            res.status(400).json({ error: data.error?.message || 'Registration failed' });
            return;
        }

        res.status(201).json({
            message: 'User registered successfully',
            token: data.idToken,
            refreshToken: data.refreshToken,
            userId: data.localId,
            email: data.email,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to register user' });
    }
});

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const response = await fetch(`${FIREBASE_AUTH_URL}:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });

        const data = await response.json() as FirebaseAuthResponse;

        if (!response.ok) {
            res.status(400).json({ error: data.error?.message || 'Login failed' });
            return;
        }

        res.json({
            message: 'User logged in successfully',
            token: data.idToken,
            refreshToken: data.refreshToken,
            userId: data.localId,
            email: data.email,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to log in user' });
    }
});

router.post('/logout', (_req, res) => {
    res.json({ message: 'Logged out successfully' });
});

router.get('/profile/check/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const token = req.headers.authorization?.split('Bearer ')[1];

    try {
        const response = await fetch(`${FIRESTORE_BASE_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.status === 404) {
            res.json({ profileCompleted: false });
            return;
        }

        if (!response.ok) {
            res.status(400).json({ error: 'Failed to check profile' });
            return;
        }

        const data = await response.json() as FirestoreDocument;
        const profileCompleted = data?.fields?.profileCompleted?.booleanValue === true;
        res.json({ profileCompleted });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check profile status' });
    }
});

router.get('/profile/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const token = req.headers.authorization?.split('Bearer ')[1];

    try {
        const response = await fetch(`${FIRESTORE_BASE_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.status === 404) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }
        if (!response.ok) {
            res.status(400).json({ error: 'Failed to fetch profile' });
            return;
        }

        const data = await response.json() as FirestoreDocument;
        res.json({ profile: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
    const { email } = req.body;
    try {
        const response = await fetch(`${FIREBASE_AUTH_URL}:sendOobCode?key=${FIREBASE_WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
        });

        const data = await response.json() as { email?: string; error?: { message: string } };

        if (!response.ok) {
            res.status(400).json({ error: data.error?.message || 'Failed to send reset email' });
            return;
        }

        res.json({ message: 'Password reset email sent successfully', email: data.email });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send password reset email' });
    }
});

router.post('/profile', async (req: Request, res: Response) => {
    const { userId, firstName, middleName, lastName, age, gender } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    const body = {
        fields: {
            firstName: { stringValue: firstName },
            middleName: { stringValue: middleName || '' },
            lastName: { stringValue: lastName },
            age: { integerValue: String(age) },
            gender: { stringValue: gender },
            profileCompleted: { booleanValue: true },
        },
    };

    try {
        const response = await fetch(`${FIRESTORE_BASE_URL}/users/${userId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json() as { error?: { message?: string } };
            res.status(400).json({ error: error.error?.message || 'Failed to save profile' });
            return;
        }

        res.json({ message: 'Profile saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

export default router;
