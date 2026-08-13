/**
 * One-off: reset an admin account's password in a chosen database.
 *
 * Reads from .env so no secret is typed on a command line or pasted in chat:
 *   PROD_DATABASE_URL        the target Neon branch DIRECT connection string
 *                            (the one WITHOUT "-pooler" in the host)
 *   PROD_ADMIN_EMAIL         which account to reset (defaults to ADMIN_EMAILS[0])
 *   PROD_ADMIN_NEW_PASSWORD  the new password to set
 *
 * Usage:  node scripts/reset-admin-password.mjs
 *
 * It prints the account's before/after state but NEVER prints the password.
 * Delete the three PROD_* lines from .env once you have logged in.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env reader (scripts do not get Next.js env loading).
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(ROOT, file);
    if (!existsSync(path)) continue;
    for (const raw of readFileSync(path, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadEnv();

const url = process.env.PROD_DATABASE_URL;
const email = (process.env.PROD_ADMIN_EMAIL || (process.env.ADMIN_EMAILS || '').split(',')[0] || '')
  .trim()
  .toLowerCase();
const newPassword = process.env.PROD_ADMIN_NEW_PASSWORD;

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

if (!url) fail('PROD_DATABASE_URL is not set in .env (use the production branch DIRECT string).');
if (url.includes('-pooler.')) {
  fail('PROD_DATABASE_URL is the POOLED endpoint. Use the DIRECT one (host without "-pooler").');
}
if (!email) fail('No target email. Set PROD_ADMIN_EMAIL in .env.');
if (!newPassword || newPassword.length < 8) {
  fail('PROD_ADMIN_NEW_PASSWORD must be set in .env and at least 8 characters.');
}

const host = (() => {
  const m = url.match(/@([^/]+)\//);
  return m ? m[1] : '(unknown host)';
})();

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  console.log(`\nTarget database host: ${host}`);
  console.log(`Target account      : ${email}\n`);

  const before = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, password: true, name: true },
  });

  if (!before) {
    fail(
      `No user "${email}" exists in THIS database. That confirms production uses a ` +
        `different branch than where the account lives. Double-check PROD_DATABASE_URL ` +
        `points at the branch your live site uses.`,
    );
  }

  console.log('Before:', {
    role: before.role,
    hadPassword: Boolean(before.password),
    name: before.name,
  });

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN', password: hash },
  });

  const after = await prisma.user.findUnique({
    where: { email },
    select: { role: true, password: true },
  });
  const verifies = after?.password ? await bcrypt.compare(newPassword, after.password) : false;

  console.log('After :', { role: after?.role, newPasswordVerifies: verifies });
  console.log(
    `\n✓ Done. Log in at your live site with ${email} and the new password.\n` +
      `  Then delete the PROD_* lines from .env.\n`,
  );
} catch (err) {
  fail(`Reset failed: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await prisma.$disconnect();
}
