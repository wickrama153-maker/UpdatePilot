import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const prismaDir = path.join(repoRoot, 'apps', 'backend', 'prisma');
const cleanDbPath = path.join(prismaDir, 'clean.db');

if (fs.existsSync(cleanDbPath)) {
  fs.unlinkSync(cleanDbPath);
  console.log(`[Clean DB] Removed existing ${cleanDbPath}`);
}

console.log(`[Clean DB] Generating pristine database at ${cleanDbPath}...`);
execSync(`npx prisma db push --skip-generate --schema=prisma/schema.prisma`, {
  cwd: path.join(repoRoot, 'apps', 'backend'),
  env: {
    ...process.env,
    DATABASE_URL: `file:${cleanDbPath.replace(/\\/g, '/')}`,
  },
  stdio: 'inherit',
});

console.log(`[Clean DB] Successfully generated clean production database template!`);
