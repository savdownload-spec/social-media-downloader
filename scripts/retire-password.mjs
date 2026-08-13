/**
 * Reset the admin account's password on the database that local dev points at
 * (DATABASE_URL). Useful for rotating a password without the forgot-password
 * email flow.
 *
 * You set NEW_ADMIN_PASSWORD in .env; this hashes it in. It is never printed.
 *
 *   node scripts/retire-password.mjs
 *
 * Then delete the NEW_ADMIN_PASSWORD line from .env.
 */
import { readFileSync, existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    if (!existsSync(f)) continue;
    for (const raw of readFileSync(f, 'utf8').split('\n')) {
      const l = raw.trim();
      if (!l || l.startsWith('#') || !l.includes('=')) continue;
      const i = l.indexOf('=');
      const k = l.slice(0, i).trim();
      const v = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}
loadEnv();

const email = ((process.env.ADMIN_EMAILS || 'savdownload@gmail.com').split(',')[0] || '')
  .trim()
  .toLowerCase();
const next = process.env.NEW_ADMIN_PASSWORD;

if (!next || next.length < 8) {
  console.error('\n✖ Set NEW_ADMIN_PASSWORD in .env (at least 8 characters), then rerun.\n');
  process.exit(1);
}

// Uses DATABASE_URL from .env (the branch local dev runs against).
const prisma = new PrismaClient();
try {
  const before = await prisma.user.findUnique({
    where: { email },
    select: { email: true, role: true },
  });
  if (!before) {
    console.error(`\n✖ No user "${email}" in this database.\n`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(next, 12);
  await prisma.user.update({ where: { email }, data: { password: hash } });

  const after = await prisma.user.findUnique({ where: { email }, select: { password: true } });
  const newWorks = after?.password ? await bcrypt.compare(next, after.password) : false;

  console.log(`\n✓ Password updated for ${email} (role ${before.role}).`);
  console.log(`  new password verifies : ${newWorks}`);
  console.log('\nNow delete the NEW_ADMIN_PASSWORD line from .env.\n');
} finally {
  await prisma.$disconnect();
}
