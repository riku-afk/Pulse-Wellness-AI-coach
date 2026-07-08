// Central client config.
// Expo only inlines env vars prefixed with EXPO_PUBLIC_ into the app bundle,
// so everything here must be read via that prefix (see Pulse/.env).
// Restart the dev server with `npx expo start -c` after changing .env values.

export const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Firebase Web API key — an app identifier, not a secret (it also ships in
// google-services.json). Used for the client-side ID-token refresh call.
export const FIREBASE_WEB_API_KEY =
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCORxS1LYSylrliTWJQEjXMNq_soG30RpU';
