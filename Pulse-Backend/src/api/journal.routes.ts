import { Router, Request, Response } from 'express';
import { generateReflection } from '../services/ai/ai.service';

const router = Router();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

interface FirestoreValue {
    stringValue?: string;
    integerValue?: string;
    doubleValue?: number;
    booleanValue?: boolean;
    nullValue?: string;
    timestampValue?: string;
}

interface FirestoreDocument {
    name?: string;
    fields: Record<string, FirestoreValue>;
}

interface RunQueryResult {
    document?: FirestoreDocument;
    readTime?: string;
}

function todayDateString(): string {
    return new Date().toISOString().split('T')[0];
}

function toFirestoreDoc(fields: Record<string, FirestoreValue>): { fields: Record<string, FirestoreValue> } {
    return { fields };
}

function parseEntry(fields: Record<string, FirestoreValue>) {
    const moodTagRaw = fields.moodTag;
    const moodTag = moodTagRaw?.integerValue != null
        ? parseInt(moodTagRaw.integerValue, 10)
        : null;
    return {
        date: fields.date?.stringValue ?? '',
        content: fields.content?.stringValue ?? '',
        moodTag,
        createdAt: fields.createdAt?.timestampValue ?? '',
        aiReflection: fields.aiReflection?.stringValue ?? null,
    };
}

// POST /api/v1/journal — create or update a journal entry
router.post('/', async (req: Request, res: Response) => {
    const { userId, content, moodTag, date } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!userId || !content?.trim()) {
        res.status(400).json({ error: 'userId and content are required' });
        return;
    }

    const entryDate = (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))
        ? date
        : todayDateString();

    const moodTagValue: FirestoreValue = (moodTag != null && typeof moodTag === 'number')
        ? { integerValue: String(Math.min(10, Math.max(1, Math.round(moodTag)))) }
        : { nullValue: 'NULL_VALUE' };

    const fields: Record<string, FirestoreValue> = {
        date: { stringValue: entryDate },
        content: { stringValue: content.trim() },
        moodTag: moodTagValue,
        createdAt: { timestampValue: new Date().toISOString() },
        aiReflection: { nullValue: 'NULL_VALUE' },
    };

    try {
        const saveResp = await fetch(
            `${FIRESTORE_BASE_URL}/users/${userId}/journal/${entryDate}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(toFirestoreDoc(fields)),
            }
        );

        if (!saveResp.ok) {
            const err = await saveResp.json() as { error?: { message?: string } };
            res.status(400).json({ error: err.error?.message || 'Failed to save journal entry' });
            return;
        }

        // Generate AI reflection (best-effort — doesn't block the response)
        let aiReflection: string | null = null;
        try {
            aiReflection = await generateReflection(content.trim(), moodTag ?? null);
        } catch (e) {
            console.error('Journal AI reflection failed:', e);
        }

        if (aiReflection) {
            await fetch(
                `${FIRESTORE_BASE_URL}/users/${userId}/journal/${entryDate}?updateMask.fieldPaths=aiReflection`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(toFirestoreDoc({
                        aiReflection: { stringValue: aiReflection },
                    })),
                }
            ).catch(() => {}); // best-effort
        }

        res.json({
            date: entryDate,
            content: content.trim(),
            moodTag: moodTag ?? null,
            createdAt: new Date().toISOString(),
            aiReflection,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save journal entry' });
    }
});

// GET /api/v1/journal?userId=...&page=... — paginated list, newest first
router.get('/', async (req: Request, res: Response) => {
    const { userId, page: pageStr } = req.query as { userId?: string; page?: string };
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!userId) {
        res.status(400).json({ error: 'userId query param is required' });
        return;
    }

    const page = Math.max(1, parseInt(pageStr ?? '1', 10));
    const limit = 10;
    const offset = (page - 1) * limit;

    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'journal' }],
            orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
            limit: limit + 1,
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
            const err = await response.json() as { error?: { message?: string } };
            res.status(400).json({ error: err.error?.message || 'Failed to fetch journal entries' });
            return;
        }

        const results = await response.json() as RunQueryResult[];
        const all = results
            .filter(r => r.document?.fields)
            .map(r => parseEntry(r.document!.fields));

        const hasMore = all.length > limit;
        res.json({ entries: all.slice(0, limit), hasMore, page });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
});

// GET /api/v1/journal/search?userId=...&q=... — full-text search across all entries
// Must be registered before /:date so Express doesn't treat "search" as a date param
router.get('/search', async (req: Request, res: Response) => {
    const { userId, q } = req.query as { userId?: string; q?: string };
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!userId || !q?.trim()) {
        res.status(400).json({ error: 'userId and q are required' });
        return;
    }

    const keyword = q.trim().toLowerCase();

    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'journal' }],
            orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
            limit: 200,
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
            const err = await response.json() as { error?: { message?: string } };
            res.status(400).json({ error: err.error?.message || 'Search failed' });
            return;
        }

        const results = await response.json() as RunQueryResult[];
        const all = results
            .filter(r => r.document?.fields)
            .map(r => parseEntry(r.document!.fields));

        const matches = all.filter(e =>
            e.content.toLowerCase().includes(keyword) ||
            e.date.includes(keyword)
        );

        res.json({ entries: matches, total: matches.length });
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// GET /api/v1/journal/:date?userId=... — fetch one entry by date
router.get('/:date', async (req: Request, res: Response) => {
    const { date } = req.params;
    const { userId } = req.query as { userId?: string };
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!userId) {
        res.status(400).json({ error: 'userId query param is required' });
        return;
    }

    try {
        const response = await fetch(
            `${FIRESTORE_BASE_URL}/users/${userId}/journal/${date}`,
            {
                headers: { 'Authorization': `Bearer ${token}` },
            }
        );

        if (response.status === 404 || !response.ok) {
            res.json(null); // entry doesn't exist yet
            return;
        }

        const doc = await response.json() as FirestoreDocument;
        if (!doc.fields) {
            res.json(null);
            return;
        }

        res.json(parseEntry(doc.fields));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch journal entry' });
    }
});

export default router;
