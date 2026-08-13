import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { claimStripeEvent, findByPriceId, grantCredits, type PlanTier } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook — the only place entitlements and credits are granted.
 *
 * Division of labour:
 *   • `checkout.session.completed`  → one-off purchases (credit packs, lifetime)
 *   • `customer.subscription.*`     → entitlement: tier, status, period end
 *   • `invoice.paid`                → the credit refill for each paid period
 *
 * Keeping refills on `invoice.paid` rather than on subscription creation means
 * the first period and every renewal take exactly the same path, so neither can
 * double-grant.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  // Signature verification needs the exact bytes Stripe sent, so the body must
  // be read raw and never parsed first.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Stripe signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  // Stripe retries deliveries; a replay is acknowledged without re-running.
  const isNew = await claimStripeEvent(event.id, event.type);
  if (!isNew) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`Stripe webhook handler failed for ${event.type}:`, error);
    // 500 makes Stripe retry. The event row is removed so the retry is not
    // mistaken for a duplicate and skipped.
    await prisma.processedStripeEvent
      .delete({ where: { id: event.id } })
      .catch(() => undefined);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** One-off purchases: credit packs and the lifetime plan. */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode === 'subscription') return; // handled by subscription events
  if (session.payment_status !== 'paid') return;

  const userId = session.client_reference_id ?? session.metadata?.userId;
  const itemId = session.metadata?.itemId;
  if (!userId || !itemId) {
    console.error('Checkout session missing user/item metadata:', session.id);
    return;
  }

  const { PURCHASABLES } = await import('@/lib/billing');
  const item = PURCHASABLES.find((p) => p.id === itemId);
  if (!item) {
    console.error('Unknown purchasable in checkout session:', itemId);
    return;
  }

  if (item.kind === 'lifetime') {
    await grantCredits({
      userId,
      amount: item.credits,
      kind: 'plan_grant',
      bucket: 'plan',
      description: 'Lifetime plan activated',
      externalId: session.id,
      resetPlanCredits: true,
      planCreditsResetAt: addMonths(new Date(), 1),
      tier: 'LIFETIME',
    });
    return;
  }

  await grantCredits({
    userId,
    amount: item.credits,
    kind: 'purchase',
    bucket: 'purchased',
    description: item.label,
    externalId: session.id,
  });
}

/** Keeps the local subscription mirror and the user's tier in step with Stripe. */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = await resolveUserId(subscription.metadata?.userId, subscription.customer);
  if (!userId) {
    console.error('No user for subscription:', subscription.id);
    return;
  }

  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id;
  const item = priceId ? findByPriceId(priceId) : undefined;
  const tier: PlanTier = item?.tier ?? 'PRO';

  // In current API versions the period boundary lives on the subscription item,
  // not on the subscription itself.
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : null;

  const entitled = subscription.status === 'active' || subscription.status === 'trialing';

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId ?? 'unknown',
      status: subscription.status,
      plan: tier,
      interval: item?.interval ?? firstItem?.price?.recurring?.interval ?? 'month',
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripePriceId: priceId ?? 'unknown',
      status: subscription.status,
      plan: tier,
      interval: item?.interval ?? firstItem?.price?.recurring?.interval ?? 'month',
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  // A lifetime purchase outranks any subscription state, so never downgrade it.
  if (user?.plan === 'LIFETIME') return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: entitled ? tier : 'FREE',
      // Losing entitlement clears the allowance; purchased credits are untouched.
      ...(entitled ? { planCreditsResetAt: periodEnd } : { planCredits: 0, planCreditsResetAt: null }),
    },
  });
}

/** Each paid invoice refills the plan allowance for the new period. */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // `price` may arrive expanded, so normalise it to an id before lookup.
  const line = invoice.lines?.data?.find((l) => l.pricing?.price_details?.price);
  const rawPrice = line?.pricing?.price_details?.price;
  const priceId = typeof rawPrice === 'string' ? rawPrice : rawPrice?.id;
  if (!priceId) return;

  const item = findByPriceId(priceId);
  if (!item || item.kind !== 'subscription') return;

  const userId = await resolveUserId(invoice.metadata?.userId, invoice.customer);
  if (!userId) {
    console.error('No user for invoice:', invoice.id);
    return;
  }

  const periodEnd = line?.period?.end
    ? new Date(line.period.end * 1000)
    : addMonths(new Date(), 1);

  await grantCredits({
    userId,
    amount: item.credits,
    kind: 'plan_refill',
    bucket: 'plan',
    description: `${item.label} — credits for this period`,
    externalId: invoice.id,
    // Allowances replace rather than accumulate, as the pricing page states.
    resetPlanCredits: true,
    planCreditsResetAt: periodEnd,
    tier: item.tier,
  });
}

/** Prefers metadata, falling back to the saved Stripe customer id. */
async function resolveUserId(
  metadataUserId: string | undefined,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  if (metadataUserId) return metadataUserId;

  const customerId = typeof customer === 'string' ? customer : customer?.id;
  if (!customerId) return null;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}
