import { prisma } from '@/lib/prisma';

/**
 * The server-side purchase catalogue.
 *
 * The pricing page in `@/config/pricing` is presentation only. This file is the
 * authority on what a purchase actually grants, and it is keyed by Stripe price
 * ID so the amount charged and the credits granted can never drift apart: the
 * webhook looks up what Stripe says was bought, not what a client asked for.
 */

export type PlanTier = 'FREE' | 'PRO' | 'LIFETIME';

export type PurchasableKind = 'subscription' | 'pack' | 'lifetime';

export type Purchasable = {
  /** Public identifier used by the checkout endpoint. */
  id: string;
  kind: PurchasableKind;
  label: string;
  /** Env var holding the Stripe price ID. */
  priceEnv: string;
  /** Entitlement granted. Packs leave the tier untouched. */
  tier?: PlanTier;
  /** Monthly allowance for subscriptions/lifetime; pack size for one-offs. */
  credits: number;
  interval?: 'month' | 'year';
  /**
   * The amount this must cost, in the smallest currency unit.
   *
   * Stripe remains the authority on what is actually charged — this is the
   * expected value that `scripts/setup-stripe.ts` creates and verifies against,
   * so a price edited in the dashboard can be caught instead of silently
   * disagreeing with the pricing page.
   */
  amountCents: number;
  currency: string;
  /** Product name and blurb used when the setup script creates them. */
  productName: string;
  productDescription: string;
};

// Amounts here must match src/config/pricing.ts (the public display) — see the
// note there. Kept in sync manually since this file is the future-checkout
// catalogue and that file is the public display.
const PRO_BLURB = '1,000 SavCredits every month, 4K downloads, batch jobs and priority processing.';

export const PURCHASABLES: Purchasable[] = [
  {
    id: 'pro-monthly',
    kind: 'subscription',
    label: 'Pro (monthly)',
    priceEnv: 'STRIPE_PRICE_PRO_MONTHLY',
    tier: 'PRO',
    credits: 1000,
    interval: 'month',
    amountCents: 999,
    currency: 'usd',
    productName: 'SavDown Pro',
    productDescription: PRO_BLURB,
  },
  {
    id: 'pro-yearly',
    kind: 'subscription',
    label: 'Pro (yearly)',
    priceEnv: 'STRIPE_PRICE_PRO_YEARLY',
    tier: 'PRO',
    credits: 1000,
    interval: 'year',
    // ~26% less than twelve monthly payments — see the yearly saving in config.
    amountCents: 8900,
    currency: 'usd',
    productName: 'SavDown Pro',
    productDescription: PRO_BLURB,
  },
  {
    id: 'pack-starter',
    kind: 'pack',
    label: 'Starter pack, 300 credits',
    priceEnv: 'STRIPE_PRICE_PACK_STARTER',
    credits: 300,
    amountCents: 500,
    currency: 'usd',
    productName: 'SavDown Credits: Starter',
    productDescription: '300 SavCredits. One-time purchase, never expires.',
  },
  {
    id: 'pack-creator',
    kind: 'pack',
    label: 'Creator pack, 1,000 credits',
    priceEnv: 'STRIPE_PRICE_PACK_CREATOR',
    credits: 1000,
    amountCents: 1400,
    currency: 'usd',
    productName: 'SavDown Credits: Creator',
    productDescription: '1,000 SavCredits. One-time purchase, never expires.',
  },
  {
    id: 'pack-power',
    kind: 'pack',
    label: 'Power pack, 3,000 credits',
    priceEnv: 'STRIPE_PRICE_PACK_POWER',
    credits: 3000,
    amountCents: 3600,
    currency: 'usd',
    productName: 'SavDown Credits: Power',
    productDescription: '3,000 SavCredits. One-time purchase, never expires.',
  },
  {
    id: 'lifetime',
    kind: 'lifetime',
    label: 'Lifetime',
    priceEnv: 'STRIPE_PRICE_LIFETIME',
    tier: 'LIFETIME',
    credits: 30000,
    amountCents: 19900,
    currency: 'usd',
    productName: 'SavDown Lifetime',
    productDescription:
      '30,000 lifetime SavCredits that never expire, plus lifetime access to premium features. One-time payment.',
  },
];

export function findPurchasable(id: string): Purchasable | undefined {
  return PURCHASABLES.find((p) => p.id === id);
}

export function priceIdFor(item: Purchasable): string | undefined {
  const value = process.env[item.priceEnv];
  return value && value.trim() ? value.trim() : undefined;
}

/** Reverse lookup used by the webhook: Stripe tells us the price, we resolve the grant. */
export function findByPriceId(priceId: string): Purchasable | undefined {
  return PURCHASABLES.find((p) => priceIdFor(p) === priceId);
}

/** Which purchasables are actually buyable right now (price ID present). */
export function configuredPurchasableIds(): string[] {
  return PURCHASABLES.filter((p) => priceIdFor(p)).map((p) => p.id);
}

/**
 * Records a credit movement and applies it to the matching balance in one
 * transaction.
 *
 * `externalId` is the Stripe object id behind the grant and is stored with a
 * unique constraint, so a webhook redelivery hits the constraint and leaves the
 * balance untouched instead of granting twice.
 */
export async function grantCredits(opts: {
  userId: string;
  amount: number;
  kind: 'purchase' | 'plan_refill' | 'plan_grant' | 'refund' | 'adjustment';
  bucket: 'plan' | 'purchased';
  description?: string;
  externalId?: string;
  /** Replace the plan allowance rather than adding to it (allowances don't stack). */
  resetPlanCredits?: boolean;
  planCreditsResetAt?: Date | null;
  tier?: PlanTier;
}): Promise<{ granted: boolean }> {
  const {
    userId,
    amount,
    kind,
    bucket,
    description,
    externalId,
    resetPlanCredits,
    planCreditsResetAt,
    tier,
  } = opts;

  try {
    await prisma.$transaction(async (tx) => {
      if (externalId) {
        // Throws on replay thanks to the unique index — caught below.
        await tx.creditTransaction.create({
          data: { userId, amount, kind, bucket, description, externalId },
        });
      } else {
        await tx.creditTransaction.create({
          data: { userId, amount, kind, bucket, description },
        });
      }

      const data: Record<string, unknown> = {};
      if (bucket === 'purchased') {
        data.purchasedCredits = { increment: amount };
      } else if (resetPlanCredits) {
        data.planCredits = amount;
      } else {
        data.planCredits = { increment: amount };
      }
      if (planCreditsResetAt !== undefined) data.planCreditsResetAt = planCreditsResetAt;
      if (tier) data.plan = tier;

      await tx.user.update({ where: { id: userId }, data });
    });
    return { granted: true };
  } catch (error) {
    // A duplicate externalId means Stripe redelivered an event we already
    // applied. That is expected and must not be treated as a failure.
    if (isUniqueViolation(error)) return { granted: false };
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

/** Credits included with each tier's allowance period. */
export const TIER_ALLOWANCE: Record<PlanTier, { credits: number; period: 'day' | 'month' }> = {
  FREE: { credits: 10, period: 'day' },
  PRO: { credits: 1000, period: 'month' },
  // Lifetime is a fixed one-time bank, not a renewing allowance — it is granted
  // once into the (never-expiring) purchased balance, so it is not self-renewed
  // in getBillingSummary. This entry is only a display reference.
  LIFETIME: { credits: 30000, period: 'month' },
};

export type BillingSummary = {
  plan: PlanTier;
  planCredits: number;
  purchasedCredits: number;
  totalCredits: number;
  planCreditsResetAt: Date | null;
  role: string;
};

/**
 * Reads a user's balances, refilling the allowance first if its period has
 * rolled over.
 *
 * The Free daily allowance renews without any Stripe activity, so it is
 * refreshed lazily on read rather than by a scheduled job. Paid subscription
 * refills stay with `invoice.paid` (the only event that proves the period was
 * paid for); Lifetime is granted once as a finite, never-expiring bank.
 */
export async function getBillingSummary(userId: string): Promise<BillingSummary | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      planCredits: true,
      planCreditsResetAt: true,
      purchasedCredits: true,
      role: true,
    },
  });
  if (!user) return null;

  const tier = user.plan as PlanTier;
  const due = !user.planCreditsResetAt || user.planCreditsResetAt.getTime() <= Date.now();
  // Only Free self-renews on read (a daily allowance). Lifetime is a finite
  // bank granted once; Pro is refilled by the paid `invoice.paid` webhook.
  const selfRenewing = tier === 'FREE';

  if (due && selfRenewing) {
    const allowance = TIER_ALLOWANCE[tier];
    const resetAt =
      allowance.period === 'day' ? addDays(new Date(), 1) : addMonths(new Date(), 1);

    await prisma.user.update({
      where: { id: userId },
      data: { planCredits: allowance.credits, planCreditsResetAt: resetAt },
    });

    return {
      plan: tier,
      planCredits: allowance.credits,
      purchasedCredits: user.purchasedCredits,
      totalCredits: allowance.credits + user.purchasedCredits,
      planCreditsResetAt: resetAt,
      role: user.role,
    };
  }

  return {
    plan: tier,
    planCredits: user.planCredits,
    purchasedCredits: user.purchasedCredits,
    totalCredits: user.planCredits + user.purchasedCredits,
    planCreditsResetAt: user.planCreditsResetAt,
    role: user.role,
  };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/**
 * Marks a Stripe event as handled. Returns false when it was already recorded,
 * which is the signal to skip the event's side effects entirely.
 */
export async function claimStripeEvent(id: string, type: string): Promise<boolean> {
  try {
    await prisma.processedStripeEvent.create({ data: { id, type } });
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}
