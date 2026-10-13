import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import sessionRoutes from './routes/sessions.js';
import consentRoutes from './routes/consents.js';
import dialogueRoutes from './routes/dialogue.js';
import documentRoutes from './routes/documents.js';
import encounterRoutes from './routes/encounters.js';
import triageRoutes from './routes/triage.js';
import hisRoutes from './routes/his.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/consents', consentRoutes);
app.use('/api/dialogue', dialogueRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/encounters', encounterRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/his', hisRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'DEMO' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
