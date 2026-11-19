import { prisma } from './prisma';
import { logger } from './logger';
import { ensureDefaultAdminUser } from '../services/authService';

let initialized = false;

/**
 * Safely ensures newly added UpdateJob and Device telemetry/ownership columns exist
 * in existing SQLite DBs (e.g. packaged Desktop userData updatepilot.db) without data loss.
 */
export async function ensureUpdateJobSchema(): Promise<void> {
  if (initialized) return;
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    const isPostgres = dbUrl.startsWith('postgresql:') || dbUrl.startsWith('postgres:');

    if (isPostgres) {
      // In PostgreSQL environments (Railway), schema is managed via Prisma migrations or prisma db push.
      await ensureDefaultAdminUser();
      initialized = true;
      return;
    }

    // 1. Migrate UpdateJob columns (SQLite compatibility)
    const updateJobCols: Array<{ name: string }> = await prisma.$queryRawUnsafe('PRAGMA table_info("UpdateJob")');
    const existingUpdateJob = new Set(updateJobCols.map((c) => c.name));
    const updateJobAdditions: Array<[string, string]> = [
      ['stage', 'TEXT'],
      ['progressPercent', 'INTEGER'],
      ['command', 'TEXT'],
      ['stdoutLog', 'TEXT'],
      ['stderrLog', 'TEXT'],
    ];

    for (const [colName, colType] of updateJobAdditions) {
      if (!existingUpdateJob.has(colName)) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "UpdateJob" ADD COLUMN "${colName}" ${colType}`);
        logger.info(`Migrated SQLite schema: added UpdateJob.${colName}`);
      }
    }

    // 2. Migrate Device ownership columns
    const deviceCols: Array<{ name: string }> = await prisma.$queryRawUnsafe('PRAGMA table_info("Device")');
    const existingDevice = new Set(deviceCols.map((c) => c.name));
    const deviceAdditions: Array<[string, string]> = [
      ['userId', 'TEXT'],
      ['hardwareId', 'TEXT'],
    ];

    for (const [colName, colType] of deviceAdditions) {
      if (!existingDevice.has(colName)) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Device" ADD COLUMN "${colName}" ${colType}`);
        logger.info(`Migrated SQLite schema: added Device.${colName}`);
      }
    }

    // Normalize any unsigned 32-bit Windows/WinGet exit codes (> 2147483647) stored prior to int32 clamping
    await prisma.$executeRawUnsafe(`
      UPDATE "UpdateJob"
      SET "exitCode" = ("exitCode" - 4294967296)
      WHERE "exitCode" IS NOT NULL AND "exitCode" > 2147483647
    `);

    // Ensure default admin user and claim unassigned legacy devices
    await ensureDefaultAdminUser();

    initialized = true;
  } catch (err: any) {
    logger.warn('Non-fatal schema check warning:', { error: err?.message || String(err) });
  }
}
