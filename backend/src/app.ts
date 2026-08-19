import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { pipelineRouter } from './routes/pipeline.js';
import { assetsRouter } from './routes/assets.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// 2. Public image streaming routes (Must precede authenticated project routes)
app.use('/api/projects', assetsRouter);

// 3. Authentication & identity routes
app.use('/api/auth', authRouter);

// 4. Project management CRUD routes
app.use('/api/projects', projectsRouter);

// 5. Pipeline execution & recovery routes
app.use('/api/projects', pipelineRouter);

export default app;
