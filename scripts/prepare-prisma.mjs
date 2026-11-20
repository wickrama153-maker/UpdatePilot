// scripts/prepare-prisma.mjs
// Inspects DATABASE_URL and executes Prisma schema push or migration for PostgreSQL / SQLite
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
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

// Ensure local node_modules/.bin is prioritized in PATH for container runner
const nodeBinPath = path.resolve(repoRoot, 'node_modules/.bin');
const execEnv = {
  ...process.env,
  PATH: `${nodeBinPath}${path.delimiter}${process.env.PATH || ''}`,
};

try {
  console.log('[UpdatePilot Prisma] Generating Prisma Client...');
  execSync(`npx prisma generate --schema="${schemaFile}"`, {
    cwd: path.resolve(repoRoot, 'apps/backend'),
    stdio: 'inherit',
    env: execEnv,
  });

  if (isPostgres) {
    console.log('[UpdatePilot Prisma] Applying version-controlled migrations (prisma migrate deploy)...');
    execSync(`npx prisma migrate deploy --schema="${schemaFile}"`, {
      cwd: path.resolve(repoRoot, 'apps/backend'),
      stdio: 'inherit',
      env: execEnv,
    });
    console.log('[UpdatePilot Prisma] PostgreSQL migrations successfully verified and deployed!');
  } else {
    console.log('[UpdatePilot Prisma] Synchronizing SQLite local development schema (prisma db push)...');
    execSync(`npx prisma db push --skip-generate --schema="${schemaFile}"`, {
      cwd: path.resolve(repoRoot, 'apps/backend'),
      stdio: 'inherit',
      env: execEnv,
    });
  }

  console.log('[UpdatePilot Prisma] Database schema successfully synchronized without data loss!');
} catch (err) {
  console.error('[UpdatePilot Prisma] Database synchronization error:', err.message);
  process.exit(1);
}
