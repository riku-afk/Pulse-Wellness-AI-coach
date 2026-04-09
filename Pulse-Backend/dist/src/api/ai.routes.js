"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_service_1 = require("../services/ai/ai.service");
const router = (0, express_1.Router)();
router.post('/chat', async (req, res) => {
    const { userMessage, pulseData, conversationHistory } = req.body;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx/Railway proxy buffering
    res.flushHeaders();
    const provider = process.env.AI_PROVIDER ?? 'ollama';
    const model = process.env.GROQ_MODEL ?? process.env.GEMINI_MODEL ?? 'default';
    console.log(`[AI] provider=${provider} model=${model}`);
    try {
        for await (const chunk of (0, ai_service_1.generateAIResponse)(userMessage, pulseData, conversationHistory ?? [])) {
            // JSON-encode so embedded newlines don't break SSE framing
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            res.flush?.();
        }
        res.write('data: [DONE]\n\n');
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[AI] Streaming error:', msg, error);
        res.write('data: [ERROR]\n\n');
    }
    finally {
        res.end();
    }
});
exports.default = router;
