import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { referralRewardStatus } from '@/lib/affiliates';
import { requireAdminApi, PRIVATE_NO_STORE_HEADERS } from '@/lib/admin-auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const rawPage = parseInt(sp.get('page') ?? '1', 10);
  const rawSize = parseInt(sp.get('pageSize') ?? '25', 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const pageSize = Number.isFinite(rawSize) ? Math.min(50, Math.max(1, rawSize)) : 25;
  const status = sp.get('status') ?? '';
  const affiliateId = sp.get('affiliateId')?.trim() ?? '';
  const where: Prisma.AffiliateWhereInput = {};
  if (affiliateId) where.id = affiliateId;
  if (['PENDING', 'ACTIVE', 'SUSPENDED'].includes(status)) where.status = status;
  const now = new Date();

  const [affiliates, total, totalAffiliates, clickAggregate, legacySignupAggregate, signupCount, qualifyingCount, rewardsAggregate, activeAggregate, expiredAggregate, rejectedCount, valueAggregate] = await Promise.all([
    prisma.affiliate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, userId: true, code: true, status: true, totalClicks: true, totalSignups: true, createdAt: true },
    }),
    prisma.affiliate.count({ where }),
    prisma.affiliate.count(),
    prisma.affiliate.aggregate({ _sum: { totalClicks: true } }),
    prisma.affiliate.aggregate({ _sum: { totalSignups: true } }),
    prisma.referral.count({ where: { status: { in: ['PENDING', 'QUALIFIED'] } } }),
    prisma.referral.count({ where: { status: 'QUALIFIED' } }),
    prisma.referral.aggregate({ where: { status: 'QUALIFIED' }, _sum: { rewardCredits: true } }),
    prisma.referral.aggregate({ where: { status: 'QUALIFIED', expiresAt: { gt: now } }, _sum: { remainingCredits: true } }),
    prisma.referral.aggregate({ where: { status: 'QUALIFIED', expiresAt: { lte: now } }, _sum: { expiredCredits: true, remainingCredits: true } }),
    prisma.referral.count({ where: { status: 'REJECTED' } }),
    prisma.referral.aggregate({ where: { status: 'QUALIFIED' }, _sum: { estimatedUsdValue: true } }),
  ]);

  const ids = affiliates.map((affiliate) => affiliate.id);
  const [countsByStatus, activeByAffiliate, expiredByAffiliate, valueByAffiliate] = await Promise.all([
    ids.length ? prisma.referral.groupBy({
      by: ['affiliateId', 'status'],
      where: { affiliateId: { in: ids } },
      _count: { _all: true },
      _sum: { rewardCredits: true },
    }) : Promise.resolve([]),
    ids.length ? prisma.referral.groupBy({
      by: ['affiliateId'],
      where: { affiliateId: { in: ids }, status: 'QUALIFIED', expiresAt: { gt: now } },
      _sum: { remainingCredits: true },
    }) : Promise.resolve([]),
    ids.length ? prisma.referral.groupBy({
      by: ['affiliateId'],
      where: { affiliateId: { in: ids }, status: 'QUALIFIED', expiresAt: { lte: now } },
      _sum: { expiredCredits: true, remainingCredits: true },
    }) : Promise.resolve([]),
    ids.length ? prisma.referral.groupBy({
      by: ['affiliateId'],
      where: { affiliateId: { in: ids }, status: 'QUALIFIED' },
      _sum: { estimatedUsdValue: true },
    }) : Promise.resolve([]),
  ]);

  const activeMap = new Map(activeByAffiliate.map((row) => [row.affiliateId, row._sum.remainingCredits ?? 0]));
  const expiredMap = new Map(expiredByAffiliate.map((row) => [
    row.affiliateId,
    (row._sum.expiredCredits ?? 0) + (row._sum.remainingCredits ?? 0),
  ]));
  const valueMap = new Map(valueByAffiliate.map((row) => [
    row.affiliateId,
    Number(row._sum.estimatedUsdValue ?? 0),
  ]));
  const countMap = new Map<string, { signups: number; qualifying: number; rewards: number; rejected: number }>();
  for (const row of countsByStatus) {
    const current = countMap.get(row.affiliateId) ?? { signups: 0, qualifying: 0, rewards: 0, rejected: 0 };
    if (row.status === 'PENDING' || row.status === 'QUALIFIED') current.signups += row._count._all;
    if (row.status === 'QUALIFIED') {
      current.qualifying += row._count._all;
      current.rewards += row._sum.rewardCredits ?? 0;
    }
    if (row.status === 'REJECTED') current.rejected += row._count._all;
    countMap.set(row.affiliateId, current);
  }

  const selectedAffiliate = affiliateId
    ? await prisma.affiliate.findUnique({ where: { id: affiliateId }, select: { id: true, code: true, totalSignups: true } })
    : null;
  const history = selectedAffiliate ? await prisma.referral.findMany({
    where: { affiliateId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      qualifiedAt: true,
      rewardCredits: true,
      remainingCredits: true,
      expiredCredits: true,
      expiresAt: true,
      estimatedUsdValue: true,
      referredUser: { select: { email: true } },
      rewardTransaction: { select: { id: true, amount: true, createdAt: true, expiresAt: true, description: true, kind: true } },
    },
  }) : [];

  return NextResponse.json({
    ok: true,
    data: {
      affiliates: affiliates.map((affiliate) => {
        const counts = countMap.get(affiliate.id) ?? { signups: 0, qualifying: 0, rewards: 0, rejected: 0 };
        return {
          ...affiliate,
          createdAt: affiliate.createdAt.toISOString(),
          legacySignups: affiliate.totalSignups,
          totalSignups: affiliate.totalSignups + counts.signups,
          qualifyingReferrals: counts.qualifying,
          rewardsIssued: counts.rewards,
          activeRewardCredits: activeMap.get(affiliate.id) ?? 0,
          expiredRewardCredits: expiredMap.get(affiliate.id) ?? 0,
          rejectedReferrals: counts.rejected,
          estimatedCreditValueUsd: valueMap.get(affiliate.id) ?? 0,
          paidConversions: 0,
          revenueUsd: 0,
        };
      }),
      totals: {
        affiliates: totalAffiliates,
        trackedLinkOpens: clickAggregate._sum.totalClicks ?? 0,
        signups: (legacySignupAggregate._sum.totalSignups ?? 0) + signupCount,
        legacySignups: legacySignupAggregate._sum.totalSignups ?? 0,
        qualifyingReferrals: qualifyingCount,
        rewardsIssued: rewardsAggregate._sum.rewardCredits ?? 0,
        activeRewardCredits: activeAggregate._sum.remainingCredits ?? 0,
        expiredRewardCredits: (expiredAggregate._sum.expiredCredits ?? 0) + (expiredAggregate._sum.remainingCredits ?? 0),
        estimatedCreditValueUsd: Number(valueAggregate._sum.estimatedUsdValue ?? 0),
        paidConversions: 0,
        revenueUsd: 0,
        rejectedReferrals: rejectedCount,
      },
      selectedAffiliate: selectedAffiliate ? {
        id: selectedAffiliate.id,
        code: selectedAffiliate.code,
        legacySignups: selectedAffiliate.totalSignups,
        referrals: history.map((referral) => ({
          ...referral,
          estimatedUsdValue: referral.estimatedUsdValue ? Number(referral.estimatedUsdValue) : null,
          rewardStatus: referralRewardStatus(referral, now),
          createdAt: referral.createdAt.toISOString(),
          qualifiedAt: referral.qualifiedAt?.toISOString() ?? null,
          rewardedAt: referral.rewardTransaction?.createdAt.toISOString() ?? null,
          expiresAt: referral.expiresAt?.toISOString() ?? null,
          rewardTransaction: referral.rewardTransaction ? {
            ...referral.rewardTransaction,
            createdAt: referral.rewardTransaction.createdAt.toISOString(),
            expiresAt: referral.rewardTransaction.expiresAt?.toISOString() ?? null,
          } : null,
        })),
      } : null,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    },
  }, { headers: PRIVATE_NO_STORE_HEADERS });
}

const patchSchema = z.object({ action: z.enum(['approve', 'suspend']), id: z.string() });

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;
  const admin = auth.user;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });

  const status = parsed.data.action === 'approve' ? 'ACTIVE' : 'SUSPENDED';
  await prisma.$transaction([
    prisma.affiliate.update({ where: { id: parsed.data.id }, data: { status } }),
    prisma.adminNotification.updateMany({ where: { entityType: 'Affiliate', entityId: parsed.data.id, resolvedAt: null }, data: { resolvedAt: new Date() } }),
  ]);
  await writeAuditLog({ adminId: admin.id, adminEmail: admin.email ?? 'admin', action: `affiliate.${parsed.data.action}`, targetType: 'Affiliate', targetId: parsed.data.id });

  return NextResponse.json({ ok: true, data: { message: `Affiliate ${parsed.data.action}d` } }, { headers: PRIVATE_NO_STORE_HEADERS });
}
