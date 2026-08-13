/**
 * One-off: remove throwaway diagnostic users created while testing production
 * login. Targets only @example.invalid addresses. Reads PROD_DIRECT_URL.
 */
import { readFileSync, existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

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

const prisma = new PrismaClient({ datasources: { db: { url: process.env.PROD_DIRECT_URL } } });
try {
  const res = await prisma.user.deleteMany({
    where: { email: { endsWith: '@example.invalid' } },
  });
  console.log('deleted diagnostic users:', res.count);
  const remaining = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log('remaining users:', JSON.stringify(remaining));
} finally {
  await prisma.$disconnect();
}
