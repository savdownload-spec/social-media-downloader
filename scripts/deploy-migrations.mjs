/**
 * deploy-migrations.mjs
 *
 * This database was originally set up with `prisma db push`, not
 * `prisma migrate`. The migrations listed in LEGACY_MIGRATIONS already exist
 * in the production DB, so this script marks only those as applied (without
 * running their SQL). Genuinely new migrations are left untouched and are
 * executed by `prisma migrate deploy` afterwards.
 *
 * Safe to run on every deploy — `migrate resolve --applied` is a no-op if the
 * migration is already recorded as successfully applied.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'prisma', 'migrations');

// Snapshot of migrations that predate this script being fixed. Everything
// after this list must be executed normally; resolving a new migration as
// applied without running its SQL is never safe.
const LEGACY_MIGRATIONS = new Set([
  '0_init',
  '20261014_session_account_indexes',
  '20261015_newsletter_provider',
  '20261017_operation_lifecycle',
  '20261018_admin_notifications',
  '20261019_add_blog_author_and_feedback',
  '20261019_affiliate_referral_rewards',
]);

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

const legacyMigrations = migrations.filter((name) => LEGACY_MIGRATIONS.has(name));
console.log(`Found ${migrations.length} migration(s); reconciling ${legacyMigrations.length} legacy migration(s) and leaving ${migrations.length - legacyMigrations.length} new migration(s) for migrate deploy...`);

for (const name of legacyMigrations) {
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
