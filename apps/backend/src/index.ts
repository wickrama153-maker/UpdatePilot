import http from 'http';
import { app } from './app';
import { logger } from './lib/logger';
import { startScheduler, stopScheduler } from './services/schedulerService';

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`UpdatePilot Backend API running on http://localhost:${PORT}`);
  logger.info(`OpenAPI Documentation available at http://localhost:${PORT}/api/docs`);
  startScheduler();
});

// Port 3000 Helper: If a user enters http://localhost:3000 in their browser,
// seamlessly redirect them to the active UpdatePilot server on http://localhost:4000
let redirectServer: http.Server | null = null;
if (Number(PORT) !== 3000) {
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

