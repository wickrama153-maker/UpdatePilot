// scripts/prepare-prisma.mjs
// Inspects DATABASE_URL and executes Prisma schema push or migration for PostgreSQL / SQLite
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dbUrl = process.env.DATABASE_URL || '';

const isPostgres = dbUrl.startsWith('postgresql:') || dbUrl.startsWith('postgres:');
const schemaFile = isPostgres
  ? path.resolve(repoRoot, 'apps/backend/prisma/schema.postgresql.prisma')
  : path.resolve(repoRoot, 'apps/backend/prisma/schema.prisma');

console.log(`[UpdatePilot Prisma] Database engine detected: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);
console.log(`[UpdatePilot Prisma] Using schema: ${schemaFile}`);

try {
  console.log('[UpdatePilot Prisma] Generating Prisma Client...');
  execSync(`npx prisma generate --schema="${schemaFile}"`, {
    cwd: path.resolve(repoRoot, 'apps/backend'),
    stdio: 'inherit',
  });

  if (isPostgres) {
    console.log('[UpdatePilot Prisma] Applying version-controlled migrations (prisma migrate deploy)...');
    try {
      execSync(`npx prisma migrate deploy --schema="${schemaFile}"`, {
        cwd: path.resolve(repoRoot, 'apps/backend'),
        stdio: 'inherit',
      });
      console.log('[UpdatePilot Prisma] PostgreSQL migrations successfully deployed!');
    } catch (migErr) {
      console.warn('[UpdatePilot Prisma] Migration deploy warning, running non-destructive db push synchronization...');
      execSync(`npx prisma db push --skip-generate --schema="${schemaFile}"`, {
        cwd: path.resolve(repoRoot, 'apps/backend'),
        stdio: 'inherit',
      });
    }
  } else {
    console.log('[UpdatePilot Prisma] Synchronizing SQLite local schema (prisma db push)...');
    execSync(`npx prisma db push --skip-generate --schema="${schemaFile}"`, {
      cwd: path.resolve(repoRoot, 'apps/backend'),
      stdio: 'inherit',
    });
  }

  console.log('[UpdatePilot Prisma] Database schema successfully synchronized!');
} catch (err) {
  console.error('[UpdatePilot Prisma] Database synchronization error:', err.message);
  process.exit(1);
}
