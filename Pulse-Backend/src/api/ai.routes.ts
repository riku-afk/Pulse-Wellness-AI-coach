import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { generateAIResponse, generateWeeklyAssessment, PulseData, ConversationMessage, WeekEntry, JournalContextEntry } from '../services/ai/ai.service';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { requirePremiumForCloudAi } from '../middleware/plan.middleware';
import { getAdminDb } from '../config/firebase-admin';
import type { firestore } from 'firebase-admin';

/**
 * Last 7 days of journal entries for the assessment prompt. Content is
 * trimmed — the model needs themes, not full essays.
 */
async function fetchRecentJournal(db: firestore.Firestore, uid: string): Promise<JournalContextEntry[]> {
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const snap = await db.collection('users').doc(uid).collection('journal')
        .where('date', '>=', start)
        .orderBy('date', 'desc')
        .limit(7)
        .get();

    return snap.docs.map(d => {
        const data = d.data();
        return {
            date: String(data.date ?? d.id),
            moodTag: typeof data.moodTag === 'number' ? data.moodTag : null,
            excerpt: String(data.content ?? '').slice(0, 400),
        };
    }).filter(j => j.excerpt.trim().length > 0);
}

const router = Router();

// AI completions cost real money — require a signed-in user, gate the cloud
// engine behind the paid plan (inert until ENFORCE_AI_PLAN=true), cap usage.
router.use(requireAuth);
router.use(requirePremiumForCloudAi);
router.use(rateLimit({ windowMs: 5 * 60 * 1000, max: 30 }));

router.post('/chat', async (req: Request, res: Response) => {
    const { userMessage, pulseData, conversationHistory } = req.body as {
        userMessage: string;
        pulseData?: PulseData;
        conversationHistory?: ConversationMessage[];
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx/Railway proxy buffering
    res.flushHeaders();

    const provider = process.env.AI_PROVIDER ?? 'ollama';
    const model = process.env.GROQ_MODEL ?? process.env.GEMINI_MODEL ?? 'default';
    console.log(`[AI] provider=${provider} model=${model}`);

    try {
        for await (const chunk of generateAIResponse(
            userMessage,
            pulseData,
            conversationHistory ?? []
        )) {
            // JSON-encode so embedded newlines don't break SSE framing
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            (res as unknown as { flush?: () => void }).flush?.();
        }
        res.write('data: [DONE]\n\n');
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[AI] Streaming error:', msg, error);
        res.write('data: [ERROR]\n\n');
    } finally {
        res.end();
    }
});

router.post('/assess', async (req: AuthedRequest, res: Response) => {
    const { weekHistory, followUpQuestion, previousAssessment } = req.body as {
        weekHistory: WeekEntry[];
        followUpQuestion?: string;
        previousAssessment?: string;
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const provider = process.env.AI_PROVIDER ?? 'ollama';
    const model = process.env.GEMINI_MODEL ?? process.env.GROQ_MODEL ?? 'default';
    console.log(`[AI] /assess provider=${provider} model=${model} entries=${weekHistory?.length ?? 0} followUp=${!!followUpQuestion}`);

    if (!weekHistory || weekHistory.length === 0) {
        console.warn('[AI] /assess called with empty weekHistory');
        res.write('data: [ERROR]\n\n');
        res.end();
        return;
    }

    const db = getAdminDb();

    // Journal-aware context — only when the user has explicitly opted in
    // (journalAiEnabled on their user doc, toggled from Settings).
    let journalEntries: JournalContextEntry[] = [];
    if (req.uid && db) {
        try {
            const userSnap = await db.collection('users').doc(req.uid).get();
            if (userSnap.data()?.journalAiEnabled === true) {
                journalEntries = await fetchRecentJournal(db, req.uid);
            }
        } catch (e) {
            console.warn('[AI] Journal context fetch failed (continuing without):', e);
        }
    }

    // The base assessment is deterministic per input, so cache it per user and only
    // hit the AI provider when the pulse data or journal context changed (the hash
    // also covers toggling journalAiEnabled, since that empties journalEntries).
    // Follow-up Q&A is conversational and never cached.
    const cacheRef = !followUpQuestion && req.uid && db
        ? db.collection('users').doc(req.uid).collection('aiCache').doc('weeklyAssessment')
        : null;
    const weekHash = createHash('sha256').update(JSON.stringify({ weekHistory, journalEntries })).digest('hex');

    if (cacheRef) {
        try {
            const snap = await cacheRef.get();
            const cached = snap.data();
            if (snap.exists && cached?.weekHash === weekHash && typeof cached.text === 'string' && cached.text.length > 0) {
                console.log(`[AI] /assess cache hit for ${req.uid}`);
                res.write(`data: ${JSON.stringify(cached.text)}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }
        } catch (e) {
            console.warn('[AI] Assessment cache read failed (generating fresh):', e);
        }
    }

    let fullText = '';
    try {
        for await (const chunk of generateWeeklyAssessment(weekHistory, followUpQuestion, previousAssessment, journalEntries)) {
            fullText += chunk;
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            (res as unknown as { flush?: () => void }).flush?.();
        }
        res.write('data: [DONE]\n\n');

        if (cacheRef && fullText.trim()) {
            cacheRef.set({ weekHash, text: fullText, createdAt: new Date().toISOString() })
                .catch(e => console.warn('[AI] Assessment cache write failed:', e));
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[AI] Weekly assessment error:', msg, error);
        res.write('data: [ERROR]\n\n');
    } finally {
        res.end();
    }
});

export default router;
