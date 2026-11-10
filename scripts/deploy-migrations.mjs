/**
 * deploy-migrations.mjs
 *
 * This database was originally set up with `prisma db push`, not
 * `prisma migrate`. All schema changes in the migrations directory already
 * exist in the production DB. This script marks every migration file as
 * applied (without running its SQL) so that `prisma migrate deploy` only
 * executes genuinely new migrations added in future deploys.
 *
 * Safe to run on every deploy — `migrate resolve --applied` is a no-op
 * if the migration is already recorded as successfully applied.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'prisma', 'migrations');

function runPrisma(args) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['prisma', ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Get all migration directory names, sorted (Prisma applies them in order).
const migrations = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'migration_lock.toml')
  .map((d) => d.name)
  .sort();

console.log(`Found ${migrations.length} migration(s). Resolving each as --applied if not already recorded...`);

for (const name of migrations) {
  // `migrate resolve --applied` succeeds silently if already applied (exit 0).
  // It fails with P3008 if already applied — that is NOT an error, so we
  // capture the exit code and treat P3008 as success.
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    command,
    ['prisma', 'migrate', 'resolve', '--applied', name],
    { stdio: ['inherit', 'inherit', 'pipe'], env: process.env }
  );

  const stderr = result.stderr?.toString() ?? '';
  const alreadyApplied = stderr.includes('P3008') || stderr.includes('already recorded as applied');

  if (result.status === 0 || alreadyApplied) {
    // Either resolved successfully or was already applied — both are fine.
    if (!alreadyApplied) {
      console.log(`  ✓ Resolved: ${name}`);
    } else {
      console.log(`  · Already applied: ${name}`);
    }
  } else {
    // A real error — print stderr and abort.
    if (stderr) process.stderr.write(stderr);
    process.exit(result.status ?? 1);
  }
}

console.log('All migrations reconciled. Running migrate deploy for any pending migrations...');
runPrisma(['migrate', 'deploy']);
