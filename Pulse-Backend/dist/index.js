"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ai_routes_1 = __importDefault(require("./src/api/ai.routes"));
const auth_routes_1 = __importDefault(require("./src/api/auth.routes"));
const pulse_routes_1 = __importDefault(require("./src/api/pulse.routes"));
const journal_routes_1 = __importDefault(require("./src/api/journal.routes"));
const notification_routes_1 = __importDefault(require("./src/api/notification.routes"));
const notification_cron_1 = require("./src/jobs/notification.cron");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' })); // base64 profile photos can be several MB
// Routes
app.use('/api/v1/ai', ai_routes_1.default);
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/pulse', pulse_routes_1.default);
app.use('/api/v1/journal', journal_routes_1.default);
app.use('/api/v1/notifications', notification_routes_1.default);
app.get('/', (_req, res) => {
    res.json({ message: 'Hello from Pulse Backend!' });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    (0, notification_cron_1.startNotificationCrons)();
});
