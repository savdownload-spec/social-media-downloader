import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { grantCredits, getBillingSummary, TIER_ALLOWANCE, addMonths, type PlanTier } from '@/lib/billing';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const adminUser = session?.user as { id?: string; role?: string; email?: string };
  if (adminUser?.role !== 'ADMIN') return forbidden();

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' } },
      creditLedger:  { orderBy: { createdAt: 'desc' }, take: 30 },
      downloads:     { orderBy: { createdAt: 'desc' }, take: 20 },
      reviews:       { orderBy: { createdAt: 'desc' }, take: 10 },
      payments:      { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!user) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // Routes through the same lazy-refill logic the Workspace/Account billing
  // pages use, so admin never shows a stale balance for a user whose daily
  // Free allowance rolled over since their last read elsewhere.
  const summary = await getBillingSummary(params.id);

  const merged = summary
    ? { ...user, plan: summary.plan, planCredits: summary.planCredits, purchasedCredits: summary.purchasedCredits, planCreditsResetAt: summary.planCreditsResetAt }
    : user;

  // Serialize dates to ISO strings for the client component
  return NextResponse.json({
    ok: true,
    data: {
      ...merged,
      createdAt: merged.createdAt.toISOString(),
      updatedAt: merged.updatedAt.toISOString(),
      emailVerified: merged.emailVerified?.toISOString() ?? null,
      planCreditsResetAt: merged.planCreditsResetAt
        ? (typeof merged.planCreditsResetAt === 'string' ? merged.planCreditsResetAt : (merged.planCreditsResetAt as Date).toISOString())
        : null,
      subscriptions: merged.subscriptions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
        // Extended fields included for the admin UI
        stripeSubscriptionId: s.stripeSubscriptionId,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        provider: s.provider,
        stripePriceId: s.stripePriceId,
        interval: s.interval,
      })),
      creditLedger: merged.creditLedger.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        // Extended balance-snapshot fields
        planDelta: c.planDelta,
        purchasedDelta: c.purchasedDelta,
        balanceAfter: c.balanceAfter,
        planBalanceAfter: c.planBalanceAfter,
        purchasedBalanceAfter: c.purchasedBalanceAfter,
      })),
      downloads: merged.downloads.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        failureCode: d.failureCode ?? null,
        failureReason: d.failureReason ?? null,
      })),
      reviews: merged.reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        approvedAt: r.approvedAt?.toISOString() ?? null,
      })),
      payments: merged.payments.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        paidAt: p.paidAt?.toISOString() ?? null,
        refundedAt: p.refundedAt?.toISOString() ?? null,
      })),
    },
  });
}

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suspend') }),
  z.object({ action: z.literal('restore') }),
  z.object({ action: z.literal('delete') }),
  z.object({ action: z.literal('changeRole'), role: z.enum(['USER', 'ADMIN']) }),
  z.object({ action: z.literal('changePlan'), plan: z.enum(['FREE', 'PRO', 'MAX', 'LIFETIME']) }),
  z.object({ action: z.literal('addCredits'), amount: z.number().int().positive(), reason: z.string().min(3) }),
  z.object({ action: z.literal('removeCredits'), amount: z.number().int().positive(), reason: z.string().min(3) }),
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const adminUser = session?.user as { id?: string; role?: string; email?: string };
  if (adminUser?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });

  const { action } = parsed.data;
  const ip = req.headers.get('x-forwarded-for') ?? undefined;

  if (action === 'suspend') {
    await prisma.user.update({ where: { id: params.id }, data: { role: 'SUSPENDED' } });
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'user.suspend', targetType: 'User', targetId: params.id, ip });
    return NextResponse.json({ ok: true, data: { message: 'User suspended' } });
  }

  if (action === 'restore') {
    await prisma.user.update({ where: { id: params.id }, data: { role: 'USER' } });
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'user.restore', targetType: 'User', targetId: params.id, ip });
    return NextResponse.json({ ok: true, data: { message: 'User restored' } });
  }

  if (action === 'delete') {
    await prisma.user.delete({ where: { id: params.id } });
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'user.delete', targetType: 'User', targetId: params.id, ip });
    return NextResponse.json({ ok: true, data: { message: 'User deleted' } });
  }

  if (action === 'changeRole') {
    if (params.id === adminUser.id && parsed.data.role !== 'ADMIN') {
      return NextResponse.json(
        { ok: false, error: 'You cannot remove your own administrator access.' },
        { status: 400 },
      );
    }
    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { role: true },
    });
    if (!target) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    await prisma.user.update({ where: { id: params.id }, data: { role: parsed.data.role } });
    await writeAuditLog({
      adminId: adminUser.id!,
      adminEmail: adminUser.email!,
      action: 'user.changeRole',
      targetType: 'User',
      targetId: params.id,
      detail: { from: target.role, to: parsed.data.role },
      ip,
    });
    return NextResponse.json({ ok: true, data: { message: `Role changed to ${parsed.data.role}` } });
  }

  if (action === 'changePlan') {
    const newPlan = parsed.data.plan as PlanTier;
    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { plan: true } });
    if (!target) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    const fromPlan = target.plan;

    // Mirrors the Stripe webhook's grant logic (lib/billing.ts, webhooks/stripe/route.ts)
    // so an admin-driven plan change lands the user in the same state a real
    // purchase would, instead of just flipping the `plan` label and leaving the
    // credit balance stuck at whatever it happened to be before.
    if (newPlan === 'LIFETIME') {
      const allowance = TIER_ALLOWANCE.LIFETIME;
      await grantCredits({
        userId: params.id,
        amount: allowance.credits,
        kind: 'plan_grant',
        bucket: 'purchased',
        description: 'Lifetime plan activated (admin)',
        tier: 'LIFETIME',
      });
      // Lifetime credits live in the purchased bucket, not the renewing plan
      // allowance, so any leftover plan allowance/reset date is stale.
      await prisma.user.update({ where: { id: params.id }, data: { planCredits: 0, planCreditsResetAt: null } });
    } else if (newPlan === 'FREE') {
      // Clearing the reset date makes the next read due for the daily
      // self-refill in getBillingSummary, the same as losing a subscription.
      await grantCredits({
        userId: params.id,
        amount: 0,
        kind: 'adjustment',
        bucket: 'plan',
        description: 'Admin plan change to FREE',
        resetPlanCredits: true,
        planCreditsResetAt: null,
        tier: 'FREE',
      });
    } else {
      const allowance = TIER_ALLOWANCE[newPlan];
      await grantCredits({
        userId: params.id,
        amount: allowance.credits,
        kind: 'plan_grant',
        bucket: 'plan',
        description: `${newPlan} plan activated (admin)`,
        resetPlanCredits: true,
        planCreditsResetAt: addMonths(new Date(), 1),
        tier: newPlan,
      });
    }

    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'user.changePlan', targetType: 'User', targetId: params.id, detail: { from: fromPlan, to: newPlan }, ip });
    return NextResponse.json({ ok: true, data: { message: `Plan changed to ${newPlan}` } });
  }

  if (action === 'addCredits') {
    const { amount, reason } = parsed.data;
    await grantCredits({ userId: params.id, amount, kind: 'adjustment', bucket: 'purchased', description: reason });
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'credit.add', targetType: 'User', targetId: params.id, detail: { amount, reason }, ip });
    return NextResponse.json({ ok: true, data: { message: `Added ${amount} credits` } });
  }

  if (action === 'removeCredits') {
    const { amount, reason } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: params.id }, select: { purchasedCredits: true } });
    const toRemove = Math.min(amount, user?.purchasedCredits ?? 0);
    await grantCredits({ userId: params.id, amount: -toRemove, kind: 'adjustment', bucket: 'purchased', description: reason });
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'credit.remove', targetType: 'User', targetId: params.id, detail: { amount: toRemove, reason }, ip });
    return NextResponse.json({ ok: true, data: { message: `Removed ${toRemove} credits` } });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
