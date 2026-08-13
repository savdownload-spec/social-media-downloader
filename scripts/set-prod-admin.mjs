/**
 * One-off: grant ADMIN to the admin email on the PRODUCTION branch and confirm
 * the billing columns are now readable. Reads PROD_DIRECT_URL from .env.
 * Does NOT change the password. Delete this file after use.
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

const email = ((process.env.ADMIN_EMAILS || 'savdownload@gmail.com').split(',')[0] || '').trim().toLowerCase();
const prisma = new PrismaClient({ datasources: { db: { url: process.env.PROD_DIRECT_URL } } });

try {
  const updated = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
    select: { email: true, role: true, password: true },
  });
  // Full select proves every billing column now exists and is readable.
  const full = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true, role: true, plan: true, planCredits: true,
      purchasedCredits: true, stripeCustomerId: true,
    },
  });
  console.log('email        :', updated.email);
  console.log('role set to  :', updated.role);
  console.log('hasPassword  :', Boolean(updated.password));
  console.log('full select  :', JSON.stringify(full));
  console.log('SCHEMA OK    : user row reads with all billing columns');
} finally {
  await prisma.$disconnect();
}
