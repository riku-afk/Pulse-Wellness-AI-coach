"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebase_admin_1 = require("../config/firebase-admin");
const router = (0, express_1.Router)();
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;
const FIREBASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const FIREBASE_STORAGE_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o`;
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const response = await fetch(`${FIREBASE_AUTH_URL}:signUp?key=${FIREBASE_WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });
        const data = await response.json();
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to register user' });
    }
});
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const response = await fetch(`${FIREBASE_AUTH_URL}:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });
        const data = await response.json();
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to log in user' });
    }
});
router.post('/logout', async (req, res) => {
    const { userId } = req.body;
    if (userId) {
        const db = (0, firebase_admin_1.getAdminDb)();
        if (db) {
            // Clear only the FCM token so this device no longer receives pushes for this user.
            // notificationsEnabled is left untouched — it reflects the user's preference, not the device state.
            await db.collection('users').doc(userId).update({ fcmToken: null })
                .catch(e => console.error(`[Auth] Failed to clear FCM token for ${userId}:`, e));
        }
    }
    res.json({ message: 'Logged out successfully' });
});
router.get('/profile/check/:userId', async (req, res) => {
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
        const data = await response.json();
        const profileCompleted = data?.fields?.profileCompleted?.booleanValue === true;
        res.json({ profileCompleted });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to check profile status' });
    }
});
router.get('/profile/:userId', async (req, res) => {
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
        const data = await response.json();
        // If photoURL was never written to Firestore (e.g. Firestore write failed after
        // a successful Storage upload), reconstruct it from the deterministic storage path.
        // The Storage path is always ProfilePicture/{userId}, so the public URL is fixed.
        if (!data.fields?.photoURL) {
            const storageURL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/ProfilePicture%2F${userId}?alt=media`;
            data.fields = data.fields ?? {};
            data.fields.photoURL = { stringValue: storageURL };
        }
        res.json({ profile: data });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const response = await fetch(`${FIREBASE_AUTH_URL}:sendOobCode?key=${FIREBASE_WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
        });
        const data = await response.json();
        if (!response.ok) {
            res.status(400).json({ error: data.error?.message || 'Failed to send reset email' });
            return;
        }
        res.json({ message: 'Password reset email sent successfully', email: data.email });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send password reset email' });
    }
});
// Upload a profile picture to Firebase Storage (ProfilePicture/{userId}) and
// write the resulting download URL back to the user's Firestore document.
router.post('/profile/:userId/avatar', async (req, res) => {
    const { userId } = req.params;
    const { base64, mimeType } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!base64 || !mimeType) {
        res.status(400).json({ error: 'base64 and mimeType are required' });
        return;
    }
    try {
        // Upload to ProfilePicture/{userId} — overwrite on every update so there is always one file per user
        const storagePath = `ProfilePicture/${userId}`;
        const encodedPath = encodeURIComponent(storagePath);
        const imageBuffer = Buffer.from(base64, 'base64');
        // Firebase Storage REST upload: path goes ONLY in the `name` query param, not in the URL
        const uploadRes = await fetch(`${FIREBASE_STORAGE_URL}?uploadType=media&name=${encodedPath}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': mimeType,
                'Content-Length': String(imageBuffer.length),
            },
            body: imageBuffer,
        });
        if (!uploadRes.ok) {
            const uploadErr = await uploadRes.json();
            console.error('[avatar] Storage upload failed:', uploadErr);
            res.status(400).json({ error: uploadErr.error?.message || 'Failed to upload image' });
            return;
        }
        console.log('[avatar] Storage upload OK');
        // Firebase Storage public download URL: encode the full path with %2F for the slash
        const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/ProfilePicture%2F${userId}?alt=media`;
        // Save the URL into the user's Firestore document (updateMask so nothing else is touched)
        const firestoreRes = await fetch(`${FIRESTORE_BASE_URL}/users/${userId}?updateMask.fieldPaths=photoURL`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields: { photoURL: { stringValue: downloadURL } } }),
        });
        if (!firestoreRes.ok) {
            const fsErr = await firestoreRes.json();
            console.error('[avatar] Firestore photoURL write failed:', fsErr);
            res.status(400).json({ error: fsErr.error?.message || 'Failed to save photo URL' });
            return;
        }
        console.log('[avatar] Firestore photoURL saved:', downloadURL);
        res.json({ message: 'Avatar updated', photoURL: downloadURL });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});
// Partial-update endpoint for per-user behavioural flags (lastPulseCheckedAt, hasSeenLanding).
// Uses Firestore updateMask so it never overwrites unrelated profile fields.
router.patch('/profile/:userId/prefs', async (req, res) => {
    const { userId } = req.params;
    const { lastPulseCheckedAt, hasSeenLanding } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];
    const fields = {};
    const maskPaths = [];
    if (lastPulseCheckedAt !== undefined) {
        fields.lastPulseCheckedAt = { integerValue: String(lastPulseCheckedAt) };
        maskPaths.push('lastPulseCheckedAt');
    }
    if (hasSeenLanding !== undefined) {
        fields.hasSeenLanding = { booleanValue: hasSeenLanding };
        maskPaths.push('hasSeenLanding');
    }
    if (maskPaths.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
    }
    const maskQuery = maskPaths.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    try {
        const response = await fetch(`${FIRESTORE_BASE_URL}/users/${userId}?${maskQuery}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields }),
        });
        if (!response.ok) {
            const err = await response.json();
            res.status(400).json({ error: err.error?.message || 'Failed to update user prefs' });
            return;
        }
        res.json({ message: 'User prefs updated' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user prefs' });
    }
});
router.patch('/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    const { firstName, middleName, lastName, age, gender, photoURL } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];
    const body = {
        fields: {
            firstName: { stringValue: firstName },
            middleName: { stringValue: middleName || '' },
            lastName: { stringValue: lastName },
            age: { integerValue: String(age) },
            gender: { stringValue: gender },
            profileCompleted: { booleanValue: true },
            ...(photoURL !== undefined && { photoURL: { stringValue: photoURL } }),
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
            const error = await response.json();
            res.status(400).json({ error: error.error?.message || 'Failed to update profile' });
            return;
        }
        res.json({ message: 'Profile updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
router.post('/profile', async (req, res) => {
    const { userId, firstName, middleName, lastName, age, gender, photoURL } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];
    const body = {
        fields: {
            firstName: { stringValue: firstName },
            middleName: { stringValue: middleName || '' },
            lastName: { stringValue: lastName },
            age: { integerValue: String(age) },
            gender: { stringValue: gender },
            profileCompleted: { booleanValue: true },
            ...(photoURL !== undefined && { photoURL: { stringValue: photoURL } }),
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
            const error = await response.json();
            res.status(400).json({ error: error.error?.message || 'Failed to save profile' });
            return;
        }
        res.json({ message: 'Profile saved successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to save profile' });
    }
});
exports.default = router;
