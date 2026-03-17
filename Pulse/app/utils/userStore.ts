interface UserSession {
    userId: string;
    token: string;
}

let currentSession: UserSession | null = null;

export function setUserSession(session: UserSession): void {
    currentSession = session;
}

export function getUserSession(): UserSession | null {
    return currentSession;
}

export function clearUserSession(): void {
    currentSession = null;
}
