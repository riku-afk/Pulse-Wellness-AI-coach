import { BACKEND_URL, FIREBASE_WEB_API_KEY } from './config';
import { useAppStore } from '../store/appStore';

/**
 * Shared backend API client.
 *
 * Firebase ID tokens expire after 1 hour. Every request made through apiFetch:
 *  1. proactively refreshes the token when it's expired (or within 60s of it),
 *  2. retries once on a 401, in case the server rejects a token that looked valid.
 * Concurrent refreshes are deduped into a single in-flight call.
 */

/** Exchange a Firebase refreshToken for a fresh idToken. */
export async function refreshIdToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const response = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_WEB_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
        }
    );

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Token refresh failed');
    }

    return {
        token: data.id_token as string,
        refreshToken: data.refresh_token as string,
    };
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Refresh the session using the stored refresh token and persist the result.
 * Returns the new idToken, or null when no refresh token exists / refresh fails.
 * Safe to call from anywhere — concurrent callers share one network call.
 */
export function refreshSession(): Promise<string | null> {
    if (!refreshInFlight) {
        refreshInFlight = doRefresh().finally(() => {
            refreshInFlight = null;
        });
    }
    return refreshInFlight;
}

async function doRefresh(): Promise<string | null> {
    const { refreshToken, setToken } = useAppStore.getState();
    if (!refreshToken) return null;
    try {
        const result = await refreshIdToken(refreshToken);
        setToken(result.token, result.refreshToken);
        return result.token;
    } catch {
        return null;
    }
}

/** True when the JWT is expired or expires within the next 60 seconds. */
function isTokenExpired(token: string): boolean {
    try {
        const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const payload = JSON.parse(atob(padded)) as { exp?: number };
        return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() + 60_000;
    } catch {
        return false; // can't decode — let the server decide
    }
}

/**
 * Returns a token that should be accepted by the backend, refreshing first
 * if the current one is (nearly) expired. Null when signed out.
 */
export async function getValidToken(explicit?: string | null): Promise<string | null> {
    // Prefer the store token — an explicitly passed one may be a stale value
    // captured by a component render before a refresh happened.
    const token = useAppStore.getState().token ?? explicit ?? null;
    if (token && isTokenExpired(token)) {
        return (await refreshSession()) ?? token;
    }
    return token;
}

export interface ApiOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    /** JSON-serialized automatically and Content-Type set. */
    body?: unknown;
    /** Attach Authorization header (default true). */
    auth?: boolean;
    /** Explicit token; the store token still wins when present. */
    token?: string | null;
    /** Fallback message when the server doesn't return { error }. */
    errorMessage?: string;
}

export async function apiFetch(path: string, options: ApiOptions = {}): Promise<Response> {
    const { method = 'GET', body, auth = true } = options;

    const doFetch = (tok: string | null) =>
        fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: {
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                ...(auth && tok ? { 'Authorization': `Bearer ${tok}` } : {}),
            },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });

    const token = auth ? await getValidToken(options.token) : null;
    let response = await doFetch(token);

    if (response.status === 401 && auth) {
        const fresh = await refreshSession();
        if (fresh) response = await doFetch(fresh);
    }

    return response;
}

/** apiFetch + JSON parse; throws Error with the server's message on non-2xx. */
export async function apiJson<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const response = await apiFetch(path, options);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = (json as { error?: string }).error
            || options.errorMessage
            || `Request failed: ${response.status}`;
        throw new Error(message);
    }
    return json as T;
}
