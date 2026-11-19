import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { logger } from './lib/logger';
import { ensureUpdateJobSchema } from './lib/ensureSchema';

// Routes
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import devicesRouter from './routes/devices';
import applicationsRouter from './routes/applications';
import updatesRouter from './routes/updates';
import scansRouter from './routes/scans';
import jobsRouter from './routes/jobs';
import historyRouter from './routes/history';
import securityRouter from './routes/security';
import settingsRouter from './routes/settings';
import agentRouter from './routes/agent';
import notificationsRouter from './routes/notifications';

dotenv.config();

export const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/api/v1/agent/heartbeat')) {
      logger.info(`${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Ensure SQLite runtime schema matches updated models before API requests
app.use('/api/v1', async (_req: Request, _res: Response, next: NextFunction) => {
  await ensureUpdateJobSchema();
  next();
});

// Swagger UI documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Healthcheck
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'UpdatePilot Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/devices', devicesRouter);
app.use('/api/v1/applications', applicationsRouter);
app.use('/api/v1/updates', updatesRouter);
app.use('/api/v1/scans', scansRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/history', historyRouter);
app.use('/api/v1/security', securityRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/agent', agentRouter);
app.use('/api/v1/notifications', notificationsRouter);

// Serve static frontend UI if available (for production desktop app / single-port hosting)
const candidateDirs = [
  process.env.STATIC_WEB_DIR,
  path.resolve(__dirname, '../../web/out'),
  path.resolve(__dirname, '../web/out'),
  path.resolve(__dirname, '../../apps/web/out'),
  typeof (process as any).resourcesPath !== 'undefined' ? path.resolve((process as any).resourcesPath, 'web/out') : null,
].filter(Boolean) as string[];

let resolvedStaticDir: string | null = null;
for (const dir of candidateDirs) {
  if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
    resolvedStaticDir = dir;
    break;
  }
}

if (resolvedStaticDir) {
  logger.info(`Serving static frontend UI from ${resolvedStaticDir}`);
  app.use(express.static(resolvedStaticDir));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(resolvedStaticDir!, 'index.html'));
  });
} else {
  logger.warn('Static frontend UI directory not found; API routes active only.');
}

// Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled server error', { error: err.message, stack: err.stack, path: req.path });
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});
