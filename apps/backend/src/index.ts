import { app } from './app';
import { logger } from './lib/logger';
import { startScheduler, stopScheduler } from './services/schedulerService';

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`UpdatePilot Backend API running on http://localhost:${PORT}`);
  logger.info(`OpenAPI Documentation available at http://localhost:${PORT}/api/docs`);
  startScheduler();
});

process.on('SIGINT', () => {
  stopScheduler();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  stopScheduler();
  server.close(() => process.exit(0));
});
