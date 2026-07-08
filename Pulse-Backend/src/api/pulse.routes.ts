import { Router, Request, Response } from 'express';

const router = Router();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const SLEEP_TARGET_HOURS = 7;

interface FirestoreValue {
    stringValue?: string;
    integerValue?: string;
    doubleValue?: number;
    booleanValue?: boolean;
}

interface FirestoreDocument {
    name?: string;
    fields: Record<string, FirestoreValue>;
}

interface RunQueryResult {
    document?: FirestoreDocument;
}

function todayDateString(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function toFirestoreDoc(fields: Record<string, FirestoreValue>): { fields: Record<string, FirestoreValue> } {
    return { fields };
}

function stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

function moodStabilityLabel(moodValues: number[]): 'High' | 'Medium' | 'Low' {
    if (moodValues.length === 0) return 'High';
    const sd = stdDev(moodValues);
    if (sd < 1) return 'High';
    if (sd < 2) return 'Medium';
    return 'Low';
}

function computeStreakDays(datesDescending: string[]): number {
    if (datesDescending.length === 0) return 0;

    const todayStr = todayDateString();
    const yest = new Date();
    yest.setUTCDate(yest.getUTCDate() - 1);
    const yesterdayStr = yest.toISOString().split('T')[0];

    // Streak is alive only if the user logged today or yesterday (grace period)
    const mostRecent = datesDescending[0];
    if (mostRecent !== todayStr && mostRecent !== yesterdayStr) return 0;

    const dateSet = new Set(datesDescending);
    let streak = 0;
    const cursor = new Date(mostRecent + 'T00:00:00Z');

    while (dateSet.has(cursor.toISOString().split('T')[0])) {
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return streak;
}

router.post('/log', async (req: Request, res: Response) => {
    const { userId, moodLevel, moodLabel, sleepDuration, pulseScore, date: clientDate } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!userId || moodLevel === undefined || sleepDuration === undefined) {
        res.status(400).json({ error: 'userId, moodLevel and sleepDuration are required' });
        return;
    }

    // Accept a client-supplied date (offline check-ins synced later), bounded to
    // the last 7 days. The -1 day allowance covers clients ahead of UTC (PH is +8).
    const DAY = 24 * 60 * 60 * 1000;
    let date = todayDateString();
    if (typeof clientDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) {
        const diff = Date.parse(date) - Date.parse(clientDate);
        if (!Number.isNaN(diff) && diff >= -DAY && diff <= 7 * DAY) {
            date = clientDate;
        }
    }
    const sleepDebt = sleepDuration < SLEEP_TARGET_HOURS
        ? Math.round((SLEEP_TARGET_HOURS - sleepDuration) * 60)
        : 0;

    const body = toFirestoreDoc({
        date: { stringValue: date },
        moodLevel: { integerValue: String(moodLevel) },
        moodLabel: { stringValue: moodLabel ?? '' },
        sleepDuration: { doubleValue: sleepDuration },
        pulseScore: { integerValue: String(pulseScore ?? 0) },
        sleepDebt: { integerValue: String(sleepDebt) },
    });

    try {
        const response = await fetch(
            `${FIRESTORE_BASE_URL}/users/${userId}/dailyPulse/${date}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const error = await response.json() as { error?: { message?: string } };
            res.status(400).json({ error: error.error?.message || 'Failed to log pulse' });
            return;
        }

        res.json({ message: 'Daily pulse logged', date, sleepDebt });
    } catch (error) {
        res.status(500).json({ error: 'Failed to log daily pulse' });
    }
});

router.get('/:userId/summary', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const token = req.headers.authorization?.split('Bearer ')[1];

    try {
        // Fetch up to 60 entries for streak computation; chart data uses the most recent 7
        const queryBody = {
            structuredQuery: {
                from: [{ collectionId: 'dailyPulse' }],
                orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
                limit: 60,
            },
        };

        const response = await fetch(
            `${FIRESTORE_BASE_URL}/users/${userId}:runQuery`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queryBody),
            }
        );

        if (!response.ok) {
            const error = await response.json() as { error?: { message?: string } };
            res.status(400).json({ error: error.error?.message || 'Failed to fetch pulse data' });
            return;
        }

        const results = await response.json() as RunQueryResult[];

        // Filter out empty results (Firestore returns {readTime} rows with no document)
        const docs = results
            .filter(r => r.document?.fields)
            .map(r => r.document!.fields);

        if (docs.length === 0) {
            res.json({
                avgSleep: 0, totalSleepDebt: 0, moodStability: 'High',
                moodBars: [], sleepBars: [], debtDots: [], hasData: false,
                streakDays: 0, avgMood: null, daysLogged: 0,
                avgMoodPrev: null, avgSleepPrev: null,
            });
            return;
        }

        // Streak — computed from all fetched dates (newest-first)
        const allDates = docs.map(d => d.date?.stringValue ?? '').filter(Boolean);
        const streakDays = computeStreakDays(allDates);

        // This week — most recent 7 logged entries, reversed to chronological for charts
        const thisWeekDocs = docs.slice(0, 7);
        const chartDocs = [...thisWeekDocs].reverse();

        const sleepValues = chartDocs.map(d => d.sleepDuration?.doubleValue ?? 0);
        const moodValues = chartDocs.map(d => parseInt(d.moodLevel?.integerValue ?? '0', 10));
        const debtValues = chartDocs.map(d => parseInt(d.sleepDebt?.integerValue ?? '0', 10));

        const avgSleep = parseFloat((sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1));
        const totalSleepDebt = debtValues.reduce((a, b) => a + b, 0);
        const moodStability = moodStabilityLabel(moodValues);
        const avgMood = parseFloat((moodValues.reduce((a, b) => a + b, 0) / moodValues.length).toFixed(1));
        const daysLogged = thisWeekDocs.length;

        // Previous 7 logged entries for week-over-week comparison
        const prevDocs = docs.slice(7, 14);
        const prevMoodValues = prevDocs.map(d => parseInt(d.moodLevel?.integerValue ?? '0', 10));
        const prevSleepValues = prevDocs.map(d => d.sleepDuration?.doubleValue ?? 0);
        const avgMoodPrev = prevDocs.length > 0
            ? parseFloat((prevMoodValues.reduce((a, b) => a + b, 0) / prevMoodValues.length).toFixed(1))
            : null;
        const avgSleepPrev = prevDocs.length > 0
            ? parseFloat((prevSleepValues.reduce((a, b) => a + b, 0) / prevSleepValues.length).toFixed(1))
            : null;

        res.json({
            avgSleep, totalSleepDebt, moodStability,
            moodBars: moodValues, sleepBars: sleepValues, debtDots: debtValues,
            hasData: true, streakDays, avgMood, daysLogged, avgMoodPrev, avgSleepPrev,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pulse summary' });
    }
});

// Save AI suggestion for a specific day's pulse entry
router.patch('/:userId/ai/:date', async (req: Request, res: Response) => {
    const { userId, date } = req.params;
    const { aiSuggestion } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    const body = toFirestoreDoc({
        aiSuggestion: { stringValue: aiSuggestion ?? '' },
    });

    try {
        const response = await fetch(
            `${FIRESTORE_BASE_URL}/users/${userId}/dailyPulse/${date}?updateMask.fieldPaths=aiSuggestion`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const error = await response.json() as { error?: { message?: string } };
            res.status(400).json({ error: error.error?.message || 'Failed to save AI suggestion' });
            return;
        }

        res.json({ message: 'AI suggestion saved' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save AI suggestion' });
    }
});

// Get last N pulse entries with full data including AI suggestion (default 5, max 7)
router.get('/:userId/recent', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const token = req.headers.authorization?.split('Bearer ')[1];
    const limit = Math.min(7, Math.max(1, parseInt((req.query.limit as string) ?? '5', 10)));

    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'dailyPulse' }],
            orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
            limit,
        },
    };

    try {
        const response = await fetch(
            `${FIRESTORE_BASE_URL}/users/${userId}:runQuery`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queryBody),
            }
        );

        if (!response.ok) {
            const error = await response.json() as { error?: { message?: string } };
            res.status(400).json({ error: error.error?.message || 'Failed to fetch recent pulse' });
            return;
        }

        const results = await response.json() as RunQueryResult[];
        const entries = results
            .filter(r => r.document?.fields)
            .map(r => ({
                date: r.document!.fields.date?.stringValue ?? '',
                moodLevel: parseInt(r.document!.fields.moodLevel?.integerValue ?? '0', 10),
                moodLabel: r.document!.fields.moodLabel?.stringValue ?? '',
                sleepDuration: r.document!.fields.sleepDuration?.doubleValue
                    ?? parseFloat(r.document!.fields.sleepDuration?.integerValue ?? '0'),
                sleepDebt: parseInt(r.document!.fields.sleepDebt?.integerValue ?? '0', 10),
                pulseScore: parseInt(r.document!.fields.pulseScore?.integerValue ?? '0', 10),
                aiSuggestion: r.document!.fields.aiSuggestion?.stringValue ?? '',
            }));

        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recent pulse' });
    }
});

// Paginated full pulse history — 5 per page, newest first
router.get('/:userId/history', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
    const limit = 5;
    const offset = (page - 1) * limit;
    const token = req.headers.authorization?.split('Bearer ')[1];

    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'dailyPulse' }],
            orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
            limit: limit + 1, // one extra to detect hasMore
            offset,
        },
    };

    try {
        const response = await fetch(
            `${FIRESTORE_BASE_URL}/users/${userId}:runQuery`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queryBody),
            }
        );

        if (!response.ok) {
            const error = await response.json() as { error?: { message?: string } };
            res.status(400).json({ error: error.error?.message || 'Failed to fetch pulse history' });
            return;
        }

        const results = await response.json() as RunQueryResult[];
        const all = results
            .filter(r => r.document?.fields)
            .map(r => ({
                date: r.document!.fields.date?.stringValue ?? '',
                moodLevel: parseInt(r.document!.fields.moodLevel?.integerValue ?? '0', 10),
                moodLabel: r.document!.fields.moodLabel?.stringValue ?? '',
                sleepDuration: r.document!.fields.sleepDuration?.doubleValue
                    ?? parseFloat(r.document!.fields.sleepDuration?.integerValue ?? '0'),
                sleepDebt: parseInt(r.document!.fields.sleepDebt?.integerValue ?? '0', 10),
                pulseScore: parseInt(r.document!.fields.pulseScore?.integerValue ?? '0', 10),
                aiSuggestion: r.document!.fields.aiSuggestion?.stringValue ?? '',
            }));

        const hasMore = all.length > limit;
        res.json({ entries: all.slice(0, limit), hasMore, page });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pulse history' });
    }
});

export default router;
