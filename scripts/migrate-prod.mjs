/**
 * One-off: push the current Prisma schema to the PRODUCTION Neon branch.
 *
 * Reads PROD_DIRECT_URL from .env (the production branch DIRECT connection
 * string) and runs `prisma db push` against it, without disturbing the
 * DATABASE_URL used for local dev. Additive only; never prints the secret.
 *
 *   node scripts/migrate-prod.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    if (!existsSync(f)) continue;
    for (const raw of readFileSync(f, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const i = line.indexOf('=');
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}
loadEnv();

const prod = process.env.PROD_DIRECT_URL;
if (!prod) {
  console.error('✖ PROD_DIRECT_URL not set in .env');
  process.exit(1);
}
if (prod.includes('-pooler.')) {
  console.error('✖ PROD_DIRECT_URL is the pooled endpoint. Use the direct one (no "-pooler").');
  process.exit(1);
}

const host = (prod.match(/@([^/]+)\//) || [])[1] || '(unknown)';
console.log(`Pushing schema to production branch: ${host}\n`);

const res = spawnSync(
  'npx',
  ['prisma', 'db', 'push', '--accept-data-loss', '--skip-generate'],
  {
    stdio: 'inherit',
    shell: true,
    // Point Prisma at production for this command only.
    env: { ...process.env, DATABASE_URL: prod, DIRECT_URL: prod },
  },
);

process.exit(res.status ?? 1);
