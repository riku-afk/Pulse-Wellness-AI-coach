import { Router, Request, Response } from 'express';
import { generateAIResponse, PulseData, ConversationMessage } from '../services/ai/ai.service';

const router = Router();

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

export default router;
