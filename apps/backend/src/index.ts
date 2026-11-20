import http from 'http';
import { app } from './app';
import { logger } from './lib/logger';
import { ensureUpdateJobSchema } from './lib/ensureSchema';
import { startScheduler, stopScheduler } from './services/schedulerService';
import { getJwtSecret } from './services/authService';

// Validate JWT configuration before starting
try {
  getJwtSecret();
} catch (err: any) {
  logger.error(err.message);
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 4000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, async () => {
  logger.info(`UpdatePilot Backend API running on http://${HOST}:${PORT}`);
  logger.info(`OpenAPI Documentation available at /api/docs`);
  try {
    await ensureUpdateJobSchema();
    startScheduler();
  } catch (err: any) {
    logger.error('Startup initialization error:', { error: err.message, stack: err.stack });
  }
});

// Port 3000 Helper (Local Development Only): If a user enters http://localhost:3000,
// redirect to the active UpdatePilot backend port
let redirectServer: http.Server | null = null;
if (process.env.NODE_ENV !== 'production' && Number(PORT) !== 3000) {
  try {
    redirectServer = http.createServer((req, res) => {
      res.writeHead(302, {
        Location: `http://localhost:${PORT}${req.url || '/'}`,
        'Content-Type': 'text/plain',
      });
      res.end(`Redirecting to UpdatePilot on http://localhost:${PORT}\n`);
    });
    redirectServer.on('error', () => {
      // Safely ignore if port 3000 is occupied by Next.js dev or another process
    });
    redirectServer.listen(3000, () => {
      logger.info(`Port 3000 redirect active -> http://localhost:${PORT}`);
    });
  } catch {
    // Ignore any socket setup error
  }
}

process.on('SIGINT', () => {
  stopScheduler();
  if (redirectServer) redirectServer.close();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  stopScheduler();
  if (redirectServer) redirectServer.close();
  server.close(() => process.exit(0));
});

