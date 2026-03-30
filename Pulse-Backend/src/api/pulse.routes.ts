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

router.post('/log', async (req: Request, res: Response) => {
    const { userId, moodLevel, moodLabel, sleepDuration, pulseScore } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!userId || moodLevel === undefined || sleepDuration === undefined) {
        res.status(400).json({ error: 'userId, moodLevel and sleepDuration are required' });
        return;
    }

    const date = todayDateString();
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
        // Query last 7 dailyPulse docs ordered by date descending
        const queryBody = {
            structuredQuery: {
                from: [{ collectionId: 'dailyPulse' }],
                orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
                limit: 7,
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
                avgSleep: 0,
                totalSleepDebt: 0,
                moodStability: 'High',
                moodBars: [],
                sleepBars: [],
                debtDots: [],
                hasData: false,
            });
            return;
        }

        // Results are newest-first — reverse to chronological for chart arrays
        const chronological = [...docs].reverse();

        const sleepValues = chronological.map(d => d.sleepDuration?.doubleValue ?? 0);
        const moodValues = chronological.map(d => parseInt(d.moodLevel?.integerValue ?? '0', 10));
        const debtValues = chronological.map(d => parseInt(d.sleepDebt?.integerValue ?? '0', 10));

        const avgSleep = parseFloat(
            (sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1)
        );
        const totalSleepDebt = debtValues.reduce((a, b) => a + b, 0);
        const moodStability = moodStabilityLabel(moodValues);

        res.json({
            avgSleep,
            totalSleepDebt,
            moodStability,
            moodBars: moodValues,
            sleepBars: sleepValues,
            debtDots: debtValues,
            hasData: true,
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

// Get last 5 pulse entries with full data including AI suggestion
router.get('/:userId/recent', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const token = req.headers.authorization?.split('Bearer ')[1];

    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'dailyPulse' }],
            orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
            limit: 5,
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
