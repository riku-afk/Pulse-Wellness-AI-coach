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
    res.flushHeaders();

    try {
        for await (const chunk of generateAIResponse(
            userMessage,
            pulseData,
            conversationHistory ?? []
        )) {
            res.write(`data: ${chunk}\n\n`);
            (res as unknown as { flush?: () => void }).flush?.();
        }
        res.write('data: [DONE]\n\n');
    } catch (error) {
        console.error('Streaming error:', error);
        res.write('data: [ERROR]\n\n');
    } finally {
        res.end();
    }
});

export default router;
