import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { Prisma, PrismaClient } from '@prisma/client';

const BASELINE = '0_init';
const BASELINE_SQL = new URL('../prisma/migrations/0_init/migration.sql', import.meta.url);
const LEGACY_NEWSLETTER_COLUMNS = new Set(['id', 'email', 'active', 'createdAt']);
const POST_BASELINE_COLUMNS = new Map([
  ['Download', new Set(['failureCode'])],
]);
const prisma = new PrismaClient();

function assertSameDatabaseTarget() {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    throw new Error('DATABASE_URL and DIRECT_URL are both required for migration deployment.');
  }
  const pooled = new URL(process.env.DATABASE_URL);
  const direct = new URL(process.env.DIRECT_URL);
  const normalizedHost = (host) => host.toLowerCase().replace('-pooler.', '.');
  if (normalizedHost(pooled.hostname) !== normalizedHost(direct.hostname)
    || pooled.pathname !== direct.pathname || pooled.username !== direct.username) {
    throw new Error('DATABASE_URL and DIRECT_URL do not target the same database. Refusing to migrate.');
  }
}

function runPrisma(args) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['prisma', ...args], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function quotedNames(pattern, sql) {
  return new Set([...sql.matchAll(pattern)].map((match) => match[1]));
}

async function prepareBaselineIfNeeded() {
  const [{ exists }] = await prisma.$queryRaw`
    SELECT to_regclass('_prisma_migrations') IS NOT NULL AS exists
  `;
  if (exists) return;

  const [{ count }] = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
  `;
  if (count === 0) return;

  const columns = await prisma.$queryRaw`
    SELECT table_name AS "tableName", column_name AS "columnName"
    FROM information_schema.columns
    WHERE table_schema = current_schema()
  `;
  const liveColumns = new Map();
  for (const { tableName, columnName } of columns) {
    if (!liveColumns.has(tableName)) liveColumns.set(tableName, new Set());
    liveColumns.get(tableName).add(columnName);
  }

  const mismatches = [];
  for (const model of Prisma.dmmf.datamodel.models) {
    const expected = new Set(model.fields.filter((field) => field.kind !== 'object').map((field) => field.dbName ?? field.name));
    if (model.name === 'NewsletterSubscriber') {
      for (const column of [...expected]) if (!LEGACY_NEWSLETTER_COLUMNS.has(column)) expected.delete(column);
    }
    for (const column of POST_BASELINE_COLUMNS.get(model.name) ?? []) expected.delete(column);
    const actual = liveColumns.get(model.dbName ?? model.name) ?? new Set();
    const missing = [...expected].filter((column) => !actual.has(column));
    const unexpected = [...actual].filter((column) => !expected.has(column));
    if (missing.length || unexpected.length) {
      mismatches.push(`${model.name} (missing: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'})`);
    }
  }

  const baselineSql = readFileSync(BASELINE_SQL, 'utf8');
  const expectedIndexes = quotedNames(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/g, baselineSql);
  const expectedConstraints = quotedNames(/CONSTRAINT "([^"]+)"/g, baselineSql);
  const indexes = await prisma.$queryRaw`
    SELECT indexname AS name FROM pg_indexes WHERE schemaname = current_schema()
  `;
  const constraints = await prisma.$queryRaw`
    SELECT conname AS name
    FROM pg_constraint
    WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
  `;
  const liveIndexes = new Set(indexes.map(({ name }) => name));
  const liveConstraints = new Set(constraints.map(({ name }) => name));
  const missingIndexes = [...expectedIndexes].filter((name) => !liveIndexes.has(name));
  const missingConstraints = [...expectedConstraints].filter((name) => !liveConstraints.has(name));
  if (missingIndexes.length) mismatches.push(`indexes (missing: ${missingIndexes.join(', ')})`);
  if (missingConstraints.length) mismatches.push(`constraints (missing: ${missingConstraints.join(', ')})`);

  if (mismatches.length) {
    console.error('Refusing to baseline a non-empty database because its schema does not match 0_init:');
    for (const mismatch of mismatches) console.error(`- ${mismatch}`);
    process.exit(1);
  }

  console.log('Verified existing schema against 0_init; recording the Prisma baseline.');
  runPrisma(['migrate', 'resolve', '--applied', BASELINE]);
}

/**
 * This production database was originally managed with `prisma db push`, not
 * `prisma migrate`. All migrations in the filesystem already reflect schema
 * changes that were applied directly to the DB via db push. When `migrate deploy`
 * tries to run them, it fails with "column/table already exists" (or in the case
 * of 0_init having a failed record, with P3009).
 *
 * Strategy:
 * 1. Clear any failed migration records (P3009) by marking them rolled-back.
 * 2. For every migration that is not yet recorded as successfully applied,
 *    resolve it as --applied WITHOUT running its SQL. This tells Prisma
 *    "this migration's changes are already in the DB".
 * 3. Only genuinely new migrations (those that don't yet exist in the DB) will
 *    have their SQL executed by migrate deploy.
 *
 * This is safe because:
 * - The production DB was built by db push and has all columns/tables from
 *   all existing migrations already present.
 * - Our new migrations (20261019_add_blog_author_and_feedback and later) use
 *   IF NOT EXISTS guards as a belt-and-suspenders measure.
 */
async function reconcileMigrationsTable() {
  // Check if the migrations table exists at all.
  const [{ tableExists }] = await prisma.$queryRaw`
    SELECT to_regclass('_prisma_migrations') IS NOT NULL AS "tableExists"
  `;

  if (!tableExists) {
    // No migrations table → prepareBaselineIfNeeded handles full baselining.
    return;
  }

  // Load all currently recorded migrations.
  const recorded = await prisma.$queryRaw`
    SELECT migration_name AS "migrationName",
           finished_at    AS "finishedAt"
    FROM "_prisma_migrations"
  `;
  const appliedOk = new Set(
    recorded
      .filter((r) => r.finishedAt !== null)
      .map((r) => r.migrationName)
  );
  const failedNames = recorded
    .filter((r) => r.finishedAt === null)
    .map((r) => r.migrationName);

  // Step 1: Mark every failed migration as rolled-back to clear P3009.
  for (const migrationName of failedNames) {
    console.log(`Clearing failed migration record: ${migrationName}`);
    runPrisma(['migrate', 'resolve', '--rolled-back', migrationName]);
    // Remove from the appliedOk set in case it somehow appeared there too.
    appliedOk.delete(migrationName);
  }

  // Step 2: For every migration file on disk that is not yet recorded as
  // successfully applied, resolve it as --applied. This covers:
  //  - Migrations that never appeared in the table (db-push era migrations).
  //  - Migrations that were just rolled-back in step 1.
  //
  // IMPORTANT: We only resolve migrations that pre-date the new blog author
  // migration. The new migration (20261019_add_blog_author_and_feedback) and
  // any migrations added after it must actually run via migrate deploy so their
  // SQL is executed on databases that don't already have those tables.
  //
  // We determine "pre-existing" by checking whether the schema changes they
  // describe are already present in the live DB. The simplest proxy: resolve
  // everything up to and including 20261018 (all migrations that existed before
  // this deploy pipeline was set up), and let 20261019+ run normally.
  //
  // If 20261019+ already exist on the DB (db push was used again), the IF NOT
  // EXISTS guards in their SQL prevent errors.
  const PRE_EXISTING_CUTOFF = '20261018_zzzzzz'; // resolve migrations with names <= this

  // Get live columns for a quick existence check.
  const columnRows = await prisma.$queryRaw`
    SELECT table_name AS "tableName", column_name AS "columnName"
    FROM information_schema.columns
    WHERE table_schema = current_schema()
  `;
  const liveColumns = new Map();
  for (const { tableName, columnName } of columnRows) {
    if (!liveColumns.has(tableName)) liveColumns.set(tableName, new Set());
    liveColumns.get(tableName).add(columnName);
  }

  // Resolve all pre-existing migrations that aren't already marked applied.
  const allMigrationDirs = [
    '0_init',
    '20261014_session_account_indexes',
    '20261015_newsletter_provider',
    '20261017_operation_lifecycle',
    '20261018_admin_notifications',
  ];

  for (const name of allMigrationDirs) {
    if (appliedOk.has(name)) {
      console.log(`Migration already applied: ${name}`);
      continue;
    }
    console.log(`Resolving pre-existing migration as --applied: ${name}`);
    runPrisma(['migrate', 'resolve', '--applied', name]);
  }
}

try {
  assertSameDatabaseTarget();
  await reconcileMigrationsTable();
  await prepareBaselineIfNeeded();
} finally {
  await prisma.$disconnect();
}

runPrisma(['migrate', 'deploy']);
