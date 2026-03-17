import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import aiRoutes from './src/api/ai.routes';
import authRoutes from './src/api/auth.routes';
import pulseRoutes from './src/api/pulse.routes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pulse', pulseRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Hello from Pulse Backend!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
