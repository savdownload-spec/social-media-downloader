import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { Prisma, PrismaClient } from '@prisma/client';

const BASELINE = '0_init';
const BASELINE_SQL = new URL('../prisma/migrations/0_init/migration.sql', import.meta.url);
const LEGACY_NEWSLETTER_COLUMNS = new Set(['id', 'email', 'active', 'createdAt']);
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

try {
  assertSameDatabaseTarget();
  await prepareBaselineIfNeeded();
} finally {
  await prisma.$disconnect();
}

runPrisma(['migrate', 'deploy']);
