import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { logger } from './lib/logger';

// Routes
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
const staticWebDir = process.env.STATIC_WEB_DIR || path.resolve(__dirname, '../../web/out');
if (fs.existsSync(staticWebDir)) {
  logger.info(`Serving static frontend UI from ${staticWebDir}`);
  app.use(express.static(staticWebDir));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(staticWebDir, 'index.html'));
  });
}

// Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled server error', { error: err.message, stack: err.stack, path: req.path });
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});
