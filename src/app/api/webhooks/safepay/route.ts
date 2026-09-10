import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { findPurchasable, grantCredits, addMonths, type PlanTier } from '@/lib/billing';
import { safeJson, safepayEventId, safepayEventType, verifySafepayWebhook } from '@/lib/safepay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const raw = new Uint8Array(await request.arrayBuffer());
  const signature = request.headers.get('x-sfpy-signature');
  const timestamp = request.headers.get('x-sfpy-timestamp');
  if (!verifySafepayWebhook({ body: raw, signature, timestamp })) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try { payload = safeJson(JSON.parse(new TextDecoder().decode(raw))); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const eventId = safepayEventId(request.headers, payload);
  const eventType = safepayEventType(request.headers, payload);

  try {
    await prisma.processedSafepayEvent.create({ data: { id: eventId, type: eventType } });
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ received: true, duplicate: true });
    console.error('Safepay event claim failed:', error);
    return NextResponse.json({ error: 'Could not persist event.' }, { status: 500 });
  }

  try {
    await handleEvent(eventId, eventType, payload);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Safepay webhook handler failed for ${eventType}:`, error);
    await prisma.processedSafepayEvent.delete({ where: { id: eventId } }).catch(() => undefined);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }
}

async function handleEvent(eventId: string, type: string, payload: Record<string, unknown>) {
  const data = safeJson(payload.data ?? payload.resource ?? payload);
  const metadata = safeJson(data.metadata ?? payload.metadata);
  const itemId = typeof metadata.itemId === 'string' ? metadata.itemId : undefined;
  const userId = typeof metadata.userId === 'string' ? metadata.userId : undefined;
  const paymentId = stringValue(data.token ?? data.payment_token ?? data.id ?? data.tracker_token ?? payload.id) ?? eventId;
  const subscriptionId = stringValue(data.subscription_token ?? data.subscription_id ?? data.subscriptionToken);
  const quote = safeJson(safeJson(data.purchase_totals).quote_amount);
  const amount = numberValue(data.amount ?? quote.amount) ?? 0;
  const currency = stringValue(data.currency ?? quote.currency) ?? process.env.SAFEPAY_CURRENCY ?? 'PKR';
  const normalized = type.toLowerCase();

  const status = normalized.includes('refund') ? 'refunded'
    : normalized.includes('fail') || normalized.includes('reject') || normalized.includes('reverse') ? 'failed'
      : normalized.includes('complete') || normalized.includes('settle') || normalized.includes('authorized') ? 'succeeded'
        : normalized.includes('cancel') ? 'cancelled' : 'pending';

  const jsonMetadata = payload as Prisma.InputJsonValue;
  await prisma.payment.upsert({
    where: { provider_providerPaymentId: { provider: 'SAFEPAY', providerPaymentId: paymentId } },
    create: { provider: 'SAFEPAY', providerPaymentId: paymentId, userId, itemId, amount, currency, status, reference: stringValue(data.reference ?? data.transaction_id), subscriptionId, metadata: jsonMetadata, paidAt: status === 'succeeded' ? new Date() : null, refundedAt: status === 'refunded' ? new Date() : null },
    update: { userId, itemId, amount, currency, status, reference: stringValue(data.reference ?? data.transaction_id), subscriptionId, metadata: jsonMetadata, ...(status === 'succeeded' ? { paidAt: new Date() } : {}), ...(status === 'refunded' ? { refundedAt: new Date() } : {}) },
  });

  if (subscriptionId && (normalized.includes('subscription') || normalized.includes('cancel') || normalized.includes('expire') || normalized.includes('renew'))) {
    const subscription = await prisma.subscription.findUnique({ where: { safepaySubscriptionId: subscriptionId }, select: { id: true, userId: true } });
    if (subscription) {
      const inactive = normalized.includes('cancel') || normalized.includes('expire') || normalized.includes('fail');
      await prisma.subscription.update({ where: { id: subscription.id }, data: { status: inactive ? 'canceled' : 'active', ...(normalized.includes('cancel') ? { cancelAtPeriodEnd: true } : {}) } });
      if (inactive) {
        const existing = await prisma.user.findUnique({ where: { id: subscription.userId }, select: { plan: true } });
        if (existing?.plan !== 'LIFETIME') await prisma.user.update({ where: { id: subscription.userId }, data: { plan: 'FREE', planCredits: 0, planCreditsResetAt: null } });
      }
    }
  }

  if (status === 'refunded' && userId && itemId) {
    const refundedItem = findPurchasable(itemId);
    if (refundedItem) await grantCredits({ userId, amount: -refundedItem.credits, kind: 'refund', bucket: 'purchased', description: `Refund — ${refundedItem.label}`, externalId: eventId });
    return;
  }
  if (status !== 'succeeded' || !userId || !itemId) return;
  const item = findPurchasable(itemId);
  if (!item) { console.error('Unknown Safepay item:', itemId); return; }

  if (item.kind === 'subscription') {
    const periodEnd = new Date(data.current_period_end ? String(data.current_period_end) : addMonths(new Date(), item.interval === 'year' ? 12 : 1).toISOString());
    await prisma.subscription.upsert({
      where: { safepaySubscriptionId: subscriptionId ?? `pending-${paymentId}` },
      create: { provider: 'SAFEPAY', safepaySubscriptionId: subscriptionId ?? `pending-${paymentId}`, stripeSubscriptionId: `safepay-${subscriptionId ?? paymentId}`, stripePriceId: `safepay:${item.id}`, status: 'active', plan: item.tier ?? 'PRO', interval: item.interval ?? 'month', currentPeriodEnd: periodEnd, user: { connect: { id: userId } } },
      update: { provider: 'SAFEPAY', status: 'active', plan: item.tier ?? 'PRO', interval: item.interval ?? 'month', currentPeriodEnd: periodEnd },
    });
    await grantCredits({ userId, amount: item.credits, kind: 'plan_refill', bucket: 'plan', description: `${item.label} — credits for this period`, externalId: eventId, resetPlanCredits: true, planCreditsResetAt: periodEnd, tier: (item.tier ?? 'PRO') as PlanTier });
    return;
  }

  await grantCredits({ userId, amount: item.credits, kind: item.kind === 'lifetime' ? 'plan_grant' : 'purchase', bucket: item.kind === 'lifetime' ? 'purchased' : 'purchased', description: item.label, externalId: eventId, tier: item.kind === 'lifetime' ? 'LIFETIME' : undefined });
}

function stringValue(value: unknown): string | undefined { return typeof value === 'string' && value ? value : undefined; }
function numberValue(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined; }
function isUniqueViolation(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002'; }
