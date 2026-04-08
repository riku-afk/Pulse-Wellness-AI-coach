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
    res.flushHeaders();
    try {
        for await (const chunk of (0, ai_service_1.generateAIResponse)(userMessage, pulseData, conversationHistory ?? [])) {
            res.write(`data: ${chunk}\n\n`);
            res.flush?.();
        }
        res.write('data: [DONE]\n\n');
    }
    catch (error) {
        console.error('Streaming error:', error);
        res.write('data: [ERROR]\n\n');
    }
    finally {
        res.end();
    }
});
exports.default = router;
