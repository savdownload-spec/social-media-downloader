import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { ok, fail } from '@/lib/api';
import { createAdminNotification } from '@/lib/admin-notifications';

export const dynamic = 'force-dynamic';

function generateCode(seed: string) {
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10) || 'sav';
  const suffix = randomBytes(3).toString('hex');
  return `${slug}-${suffix}`;
}

/** Returns the signed-in user's affiliate application, if any. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return fail('Please sign in to view your affiliate status.', 401);

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return fail('Account not found. Please sign in again.', 401);

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: user.id },
    select: { code: true, status: true, createdAt: true },
  });

  return ok({ affiliate });
}

/** Applies to the affiliate program on behalf of the signed-in user. */
export async function POST(request: Request) {
  const rl = await ratelimit(`affiliate-apply:${getClientId(request)}`, { limit: 5, windowSeconds: 60 });
  if (!rl.success) return fail('Too many requests. Please slow down.', 429);

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return fail('Please sign in to apply to the affiliate program.', 401);

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return fail('Account not found. Please sign in again.', 401);

  const existing = await prisma.affiliate.findUnique({ where: { userId: user.id } });
  if (existing) {
    return ok({ affiliate: { code: existing.code, status: existing.status, createdAt: existing.createdAt } });
  }

  const seed = user.name ?? user.email ?? 'savdown';
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode(seed);
    try {
      const created = await prisma.$transaction(async (tx) => {
        const affiliate = await tx.affiliate.create({
          data: { userId: user.id, code, status: 'PENDING' },
          select: { id: true, code: true, status: true, createdAt: true },
        });
        await createAdminNotification(tx, {
          type: 'AFFILIATE_APPLICATION', section: 'affiliates', entityType: 'Affiliate', entityId: affiliate.id,
          title: 'New affiliate application', message: `${user.name ?? user.email ?? 'A user'} applied to the affiliate program.`,
          href: `/admin/affiliates?affiliateId=${affiliate.id}`, dedupeKey: `affiliate:pending:${affiliate.id}`,
        });
        return affiliate;
      });

      return ok({ affiliate: { code: created.code, status: created.status, createdAt: created.createdAt } }, 201);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
        const existingAfterRace = await prisma.affiliate.findUnique({
          where: { userId: user.id },
          select: { code: true, status: true, createdAt: true },
        });
        if (existingAfterRace) return ok({ affiliate: existingAfterRace });
        continue;
      }
      throw error;
    }
  }

  return fail('Could not create a unique referral code. Please try again.', 503);
}
