import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { grantCredits, getBillingSummary, getTierAllowance, addMonths, type PlanTier } from '@/lib/billing';
import { sendEmail } from '@/lib/emails';
import { getStripe } from '@/lib/stripe';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

type NotificationStatus = 'not_requested' | 'sent' | 'failed';

type NotificationResult = {
  status: NotificationStatus;
  message?: string;
  retryAuditId?: string;
};

function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function notificationCopy(action: string, detail: Record<string, unknown>) {
  const reason = textValue(detail.reason, 'No reason was provided.');
  const effectiveDate = textValue(detail.effectiveDate, new Date().toISOString());
  const effective = new Date(effectiveDate).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' });

  if (action === 'credit.add' || action === 'credit.remove') {
    const amount = numberValue(detail.amount) ?? 0;
    const bucket = textValue(detail.bucket, 'account');
    const verb = action === 'credit.add' ? 'added to' : 'removed from';
    return {
      subject: `SavDown credit adjustment: ${amount} credits ${verb} your account`,
      text: `${amount} ${bucket} credits were ${verb} your SavDown account.\n\nReason: ${reason}\nEffective: ${effective}`,
    };
  }

  if (action === 'user.changePlan') {
    const from = textValue(detail.from, 'your previous plan');
    const to = textValue(detail.to, 'your new plan');
    return {
      subject: `Your SavDown plan changed to ${to}`,
      text: `Your SavDown plan was changed from ${from} to ${to}.\n\nReason: ${reason}\nEffective: ${effective}`,
    };
  }

  if (action === 'subscription.cancelRenewal') {
    const plan = textValue(detail.plan, 'SavDown');
    const periodEnd = textValue(detail.periodEnd, 'the end of the current billing period');
    return {
      subject: `Your ${plan} subscription will not renew`,
      text: `Renewal for your ${plan} subscription was cancelled. Your access remains active until ${periodEnd}. No refund was issued by this action.\n\nReason: ${reason}\nEffective: ${effective}`,
    };
  }

  if (action === 'subscription.resumeRenewal') {
    const plan = textValue(detail.plan, 'SavDown');
    return {
      subject: `Your ${plan} subscription renewal was restored`,
      text: `Automatic renewal for your ${plan} subscription was restored.\n\nReason: ${reason}\nEffective: ${effective}`,
    };
  }

  if (action === 'subscription.revokeAccess') {
    const plan = textValue(detail.plan, 'SavDown');
    return {
      subject: `Your ${plan} subscription access was revoked`,
      text: `Access from your ${plan} subscription was revoked immediately. This action did not issue a refund and did not remove purchased credits.\n\nReason: ${reason}\nEffective: ${effective}`,
    };
  }

  return null;
}

async function deliverUserNotification(args: {
  userId: string;
  action: string;
  detail: Record<string, unknown>;
  auditId: string | null;
  adminId: string;
  adminEmail: string;
  ip?: string;
}): Promise<NotificationResult> {
  const copy = notificationCopy(args.action, args.detail);
  if (!copy) return { status: 'failed', message: 'No email template is available for this action.', retryAuditId: args.auditId ?? undefined };

  const user = await prisma.user.findUnique({ where: { id: args.userId }, select: { email: true } });
  if (!user?.email) {
    await writeAuditLog({
      adminId: args.adminId,
      adminEmail: args.adminEmail,
      action: `${args.action}.notificationFailed`,
      targetType: 'User',
      targetId: args.userId,
      detail: { sourceAuditId: args.auditId, reason: 'User has no email address.' },
      ip: args.ip,
    });
    return { status: 'failed', message: 'The action succeeded, but the user has no email address.', retryAuditId: args.auditId ?? undefined };
  }

  try {
    const result = await sendEmail({
      to: user.email,
      subject: copy.subject,
      text: copy.text,
      html: `<p>${copy.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br />')}</p>`,
    });
    if (!result.sent) {
      await writeAuditLog({
        adminId: args.adminId,
        adminEmail: args.adminEmail,
        action: `${args.action}.notificationFailed`,
        targetType: 'User',
        targetId: args.userId,
        detail: { sourceAuditId: args.auditId, reason: result.reason },
        ip: args.ip,
      });
      return { status: 'failed', message: 'The action succeeded, but email is not configured.', retryAuditId: args.auditId ?? undefined };
    }

    await writeAuditLog({
      adminId: args.adminId,
      adminEmail: args.adminEmail,
      action: `${args.action}.notificationSent`,
      targetType: 'User',
      targetId: args.userId,
      detail: { sourceAuditId: args.auditId, recipient: user.email },
      ip: args.ip,
    });
    return { status: 'sent', message: 'User notification sent.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email provider rejected the message.';
    await writeAuditLog({
      adminId: args.adminId,
      adminEmail: args.adminEmail,
      action: `${args.action}.notificationFailed`,
      targetType: 'User',
      targetId: args.userId,
      detail: { sourceAuditId: args.auditId, reason: message },
      ip: args.ip,
    });
    return { status: 'failed', message: `The action succeeded, but notification delivery failed: ${message}`, retryAuditId: args.auditId ?? undefined };
  }
}

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
      // Step 9: include stripeCustomerId
      stripeCustomerId: merged.stripeCustomerId ?? null,
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

// ── PATCH schema ─────────────────────────────────────────────────────────────

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suspend') }),
  z.object({ action: z.literal('restore') }),
  z.object({ action: z.literal('delete') }),
  z.object({ action: z.literal('changeRole'), role: z.enum(['USER', 'ADMIN']) }),
  z.object({
    action: z.literal('changePlan'),
    plan: z.enum(['FREE', 'PRO', 'MAX', 'LIFETIME']),
    reason: z.string().min(3),
    notify: z.boolean().optional().default(false),
  }),
  // Step 7: extended addCredits/removeCredits with bucket + notify
  z.object({
    action: z.literal('addCredits'),
    amount: z.number().int().positive(),
    reason: z.string().min(3),
    bucket: z.enum(['plan', 'purchased']).optional().default('purchased'),
    notify: z.boolean().optional().default(false),
  }),
  z.object({
    action: z.literal('removeCredits'),
    amount: z.number().int().positive(),
    reason: z.string().min(3),
    bucket: z.enum(['plan', 'purchased']).optional().default('purchased'),
    notify: z.boolean().optional().default(false),
  }),
  // Step 5: subscription action cases
  z.object({
    action: z.literal('cancelSubscriptionRenewal'),
    subscriptionId: z.string().min(1),
    reason: z.string().min(3),
    notify: z.boolean().optional().default(false),
  }),
  z.object({
    action: z.literal('resumeSubscriptionRenewal'),
    subscriptionId: z.string().min(1),
    reason: z.string().min(3),
    notify: z.boolean().optional().default(false),
  }),
  z.object({
    action: z.literal('revokeSubscriptionAccess'),
    subscriptionId: z.string().min(1),
    reason: z.string().min(3),
    notify: z.boolean().optional().default(false),
  }),
  z.object({ action: z.literal('retryNotification'), auditId: z.string().min(1) }),
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

  if (action === 'retryNotification') {
    const source = await prisma.auditLog.findFirst({
      where: {
        id: parsed.data.auditId,
        action: {
          in: [
            'credit.add',
            'credit.remove',
            'user.changePlan',
            'subscription.cancelRenewal',
            'subscription.resumeRenewal',
            'subscription.revokeAccess',
          ],
        },
      },
    });
    if (!source) return NextResponse.json({ ok: false, error: 'Notification retry record not found.' }, { status: 404 });
    const sourceDetail = recordValue(source.detail);
    const belongsToUser =
      (source.targetType === 'User' && source.targetId === params.id) ||
      textValue(sourceDetail.userId) === params.id;
    if (!belongsToUser) return NextResponse.json({ ok: false, error: 'Notification retry record not found.' }, { status: 404 });

    const notification = await deliverUserNotification({
      userId: params.id,
      action: source.action,
      detail: sourceDetail,
      auditId: source.id,
      adminId: adminUser.id!,
      adminEmail: adminUser.email!,
      ip,
    });
    return NextResponse.json({
      ok: notification.status === 'sent',
      ...(notification.status === 'sent'
        ? { data: { message: notification.message, notification } }
        : { error: notification.message, notification }),
    }, { status: notification.status === 'sent' ? 200 : 502 });
  }

  // ── Existing user-level actions ───────────────────────────────────────────

  if (action === 'suspend') {
    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { role: true } });
    if (!target) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    if (target.role === 'ADMIN') return NextResponse.json({ ok: false, error: 'Administrator accounts cannot be suspended.' }, { status: 400 });
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
    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { role: true } });
    if (!target) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    if (params.id === adminUser.id || target.role === 'ADMIN') {
      return NextResponse.json({ ok: false, error: 'Administrator accounts cannot be deleted here.' }, { status: 400 });
    }
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
    const { reason, notify } = parsed.data;
    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { plan: true } });
    if (!target) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    const fromPlan = target.plan;
    if (fromPlan === newPlan) {
      return NextResponse.json({ ok: false, error: `This user is already on the ${newPlan} plan.` }, { status: 400 });
    }
    const activeSubscription = await prisma.subscription.findFirst({
      where: { userId: params.id, status: { in: ['active', 'trialing'] } },
      select: { id: true },
    });
    if (activeSubscription) {
      return NextResponse.json({
        ok: false,
        error: 'This user has an active provider subscription. Manage that subscription instead of overwriting the local plan entitlement.',
      }, { status: 400 });
    }

    // Mirrors the Stripe webhook's grant logic (lib/billing.ts, webhooks/stripe/route.ts)
    // so an admin-driven plan change lands the user in the same state a real
    // purchase would, instead of just flipping the `plan` label and leaving the
    // credit balance stuck at whatever it happened to be before.
    if (newPlan === 'LIFETIME') {
      const allowance = await getTierAllowance('LIFETIME');
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
      const allowance = await getTierAllowance(newPlan);
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

    const detail = { from: fromPlan, to: newPlan, reason, effectiveDate: new Date().toISOString() };
    const audit = await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'user.changePlan', targetType: 'User', targetId: params.id, detail, ip });
    const notification = notify
      ? await deliverUserNotification({ userId: params.id, action: 'user.changePlan', detail, auditId: audit?.id ?? null, adminId: adminUser.id!, adminEmail: adminUser.email!, ip })
      : { status: 'not_requested' as const };
    return NextResponse.json({ ok: true, data: { message: `Plan changed to ${newPlan}`, notification } });
  }

  // ── Step 7: Bucket-targeted credit actions ────────────────────────────────

  if (action === 'addCredits') {
    const { amount, reason, bucket, notify } = parsed.data;
    await grantCredits({ userId: params.id, amount, kind: 'adjustment', bucket, description: reason });
    const detail = { amount, reason, bucket, effectiveDate: new Date().toISOString() };
    const audit = await writeAuditLog({
      adminId: adminUser.id!,
      adminEmail: adminUser.email!,
      action: 'credit.add',
      targetType: 'User',
      targetId: params.id,
      detail,
      ip,
    });
    const notification = notify
      ? await deliverUserNotification({ userId: params.id, action: 'credit.add', detail, auditId: audit?.id ?? null, adminId: adminUser.id!, adminEmail: adminUser.email!, ip })
      : { status: 'not_requested' as const };
    return NextResponse.json({ ok: true, data: { message: `Added ${amount} ${bucket} credits`, notification } });
  }

  if (action === 'removeCredits') {
    const { amount, reason, bucket, notify } = parsed.data;
    // Clamp to the available balance in the specified bucket
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { planCredits: true, purchasedCredits: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    const available = bucket === 'plan' ? (user?.planCredits ?? 0) : (user?.purchasedCredits ?? 0);
    const toRemove = Math.min(amount, available);
    if (toRemove === 0) return NextResponse.json({ ok: false, error: `This user's ${bucket} credit balance is already zero.` }, { status: 400 });
    await grantCredits({ userId: params.id, amount: -toRemove, kind: 'adjustment', bucket, description: reason });
    const detail = { amount: toRemove, requestedAmount: amount, reason, bucket, effectiveDate: new Date().toISOString() };
    const audit = await writeAuditLog({
      adminId: adminUser.id!,
      adminEmail: adminUser.email!,
      action: 'credit.remove',
      targetType: 'User',
      targetId: params.id,
      detail,
      ip,
    });
    const notification = notify
      ? await deliverUserNotification({ userId: params.id, action: 'credit.remove', detail, auditId: audit?.id ?? null, adminId: adminUser.id!, adminEmail: adminUser.email!, ip })
      : { status: 'not_requested' as const };
    return NextResponse.json({ ok: true, data: { message: `Removed ${toRemove} ${bucket} credits`, notification } });
  }

  // ── Step 5: Subscription action cases ─────────────────────────────────────

  if (action === 'cancelSubscriptionRenewal') {
    const { subscriptionId, reason, notify } = parsed.data;

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, stripeSubscriptionId: true, provider: true, userId: true, plan: true, currentPeriodEnd: true },
    });
    if (!sub || sub.userId !== params.id) {
      return NextResponse.json({ ok: false, error: 'Subscription not found for this user.' }, { status: 404 });
    }
    if (sub.provider === 'SAFEPAY') {
      return NextResponse.json(
        { ok: false, error: 'Safepay subscription cancellation is not supported via API — manage directly in the Safepay dashboard.' },
        { status: 400 },
      );
    }
    if (!sub.stripeSubscriptionId) {
      return NextResponse.json({ ok: false, error: 'No Stripe subscription ID on this record.' }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: 'Stripe is not configured. Set STRIPE_SECRET_KEY to use subscription management.' },
        { status: 503 },
      );
    }

    try {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    } catch (stripeErr) {
      const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      return NextResponse.json({ ok: false, error: `Stripe error: ${message}` }, { status: 502 });
    }

    // Only update DB after Stripe confirms
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { cancelAtPeriodEnd: true },
    });
    const detail = {
      reason,
      plan: sub.plan,
      userId: params.id,
      periodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      effectiveDate: new Date().toISOString(),
    };
    const audit = await writeAuditLog({
      adminId: adminUser.id!,
      adminEmail: adminUser.email!,
      action: 'subscription.cancelRenewal',
      targetType: 'Subscription',
      targetId: subscriptionId,
      detail,
      ip,
    });
    const notification = notify
      ? await deliverUserNotification({ userId: params.id, action: 'subscription.cancelRenewal', detail, auditId: audit?.id ?? null, adminId: adminUser.id!, adminEmail: adminUser.email!, ip })
      : { status: 'not_requested' as const };
    return NextResponse.json({ ok: true, data: { message: 'Subscription renewal cancelled. User retains access until the period end.', notification } });
  }

  if (action === 'resumeSubscriptionRenewal') {
    const { subscriptionId, reason, notify } = parsed.data;
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, stripeSubscriptionId: true, provider: true, userId: true, plan: true, status: true, cancelAtPeriodEnd: true },
    });
    if (!sub || sub.userId !== params.id) {
      return NextResponse.json({ ok: false, error: 'Subscription not found for this user.' }, { status: 404 });
    }
    if (sub.provider === 'SAFEPAY' || !sub.stripeSubscriptionId) {
      return NextResponse.json({ ok: false, error: 'Only Stripe subscriptions can be resumed here.' }, { status: 400 });
    }
    if (!['active', 'trialing'].includes(sub.status) || !sub.cancelAtPeriodEnd) {
      return NextResponse.json({ ok: false, error: 'This subscription is not awaiting cancellation.' }, { status: 400 });
    }
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ ok: false, error: 'Stripe is not configured.' }, { status: 503 });

    try {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false });
    } catch (stripeErr) {
      const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      return NextResponse.json({ ok: false, error: `Stripe error: ${message}` }, { status: 502 });
    }

    await prisma.subscription.update({ where: { id: subscriptionId }, data: { cancelAtPeriodEnd: false } });
    const detail = { reason, plan: sub.plan, userId: params.id, effectiveDate: new Date().toISOString() };
    const audit = await writeAuditLog({
      adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'subscription.resumeRenewal',
      targetType: 'Subscription', targetId: subscriptionId, detail, ip,
    });
    const notification = notify
      ? await deliverUserNotification({ userId: params.id, action: 'subscription.resumeRenewal', detail, auditId: audit?.id ?? null, adminId: adminUser.id!, adminEmail: adminUser.email!, ip })
      : { status: 'not_requested' as const };
    return NextResponse.json({ ok: true, data: { message: 'Subscription renewal restored.', notification } });
  }

  if (action === 'revokeSubscriptionAccess') {
    const { subscriptionId, reason, notify } = parsed.data;

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, stripeSubscriptionId: true, provider: true, userId: true, plan: true },
    });
    if (!sub || sub.userId !== params.id) {
      return NextResponse.json({ ok: false, error: 'Subscription not found for this user.' }, { status: 404 });
    }
    if (sub.provider === 'SAFEPAY') {
      return NextResponse.json(
        { ok: false, error: 'Safepay subscription cancellation is not supported via API — manage directly in the Safepay dashboard.' },
        { status: 400 },
      );
    }
    if (!sub.stripeSubscriptionId) {
      return NextResponse.json({ ok: false, error: 'No Stripe subscription ID on this record.' }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: 'Stripe is not configured. Set STRIPE_SECRET_KEY to use subscription management.' },
        { status: 503 },
      );
    }

    try {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    } catch (stripeErr) {
      const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      return NextResponse.json({ ok: false, error: `Stripe error: ${message}` }, { status: 502 });
    }

    // Only update DB after Stripe confirms
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'canceled', cancelAtPeriodEnd: true },
    });
    const [targetUser, otherEntitlement] = await Promise.all([
      prisma.user.findUnique({ where: { id: params.id }, select: { plan: true } }),
      prisma.subscription.findFirst({
        where: { userId: params.id, id: { not: subscriptionId }, status: { in: ['active', 'trialing'] } },
        select: { id: true },
      }),
    ]);
    if (targetUser?.plan !== 'LIFETIME' && !otherEntitlement) {
      await grantCredits({
        userId: params.id,
        amount: 0,
        kind: 'adjustment',
        bucket: 'plan',
        description: 'Subscription access revoked by an administrator; plan allowance expired',
        resetPlanCredits: true,
        planCreditsResetAt: null,
        tier: 'FREE',
      });
    }
    const detail = { reason, plan: sub.plan, userId: params.id, effectiveDate: new Date().toISOString() };
    const audit = await writeAuditLog({
      adminId: adminUser.id!,
      adminEmail: adminUser.email!,
      action: 'subscription.revokeAccess',
      targetType: 'Subscription',
      targetId: subscriptionId,
      detail,
      ip,
    });
    const notification = notify
      ? await deliverUserNotification({ userId: params.id, action: 'subscription.revokeAccess', detail, auditId: audit?.id ?? null, adminId: adminUser.id!, adminEmail: adminUser.email!, ip })
      : { status: 'not_requested' as const };
    return NextResponse.json({ ok: true, data: { message: 'Subscription access revoked immediately.', notification } });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
