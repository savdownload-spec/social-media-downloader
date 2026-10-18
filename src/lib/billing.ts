import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getPricingConfig } from '@/lib/pricing-server';
import type { PlanTier } from '@/types/plans';

/**
 * The server-side purchase catalogue.
 *
 * The pricing page in `@/config/pricing` is presentation only. This file is the
 * authority on what a purchase actually grants, and it is keyed by Stripe price
 * ID so the amount charged and the credits granted can never drift apart: the
 * webhook looks up what Stripe says was bought, not what a client asked for.
 */

export type { PlanTier } from '@/types/plans';

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

/** Resolves the live admin catalogue. Archived items remain resolvable for
 * webhook retries, but are never offered to a new checkout. */
export async function findPurchasable(id: string, includeUnavailable = false): Promise<Purchasable | undefined> {
  const pricing = await getPricingConfig();
  if (id.startsWith('subscription:')) {
    const [, planId, period] = id.split(':');
    const plan = pricing.plans.find((value) => value.id === planId);
    if (!plan || !['monthly', 'yearly'].includes(period) || !plan.billingIntervals.includes(period as 'monthly' | 'yearly')) return undefined;
    if (!includeUnavailable && (!plan.visible || plan.archived)) return undefined;
    const amount = period === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    if (amount <= 0 || plan.entitlementTier === 'FREE') return undefined;
    return {
      id, kind: 'subscription', label: `${plan.name} (${period})`, priceEnv: '', tier: plan.entitlementTier,
      credits: plan.monthlyCredits, interval: period === 'yearly' ? 'year' : 'month', amountCents: Math.round(amount * 100), currency: 'usd',
      productName: plan.name, productDescription: plan.description || plan.tagline,
    };
  }
  if (id.startsWith('pack:')) {
    const pack = pricing.packs.find((value) => value.id === id.slice('pack:'.length));
    if (!pack || (!includeUnavailable && (!pack.visible || pack.archived))) return undefined;
    return { id, kind: 'pack', label: `${pack.name}, ${(pack.credits + (pack.bonus ?? 0)).toLocaleString()} credits`, priceEnv: '', credits: pack.credits + (pack.bonus ?? 0), amountCents: Math.round(pack.price * 100), currency: 'usd', productName: pack.name, productDescription: pack.tagline };
  }
  if (id.startsWith('lifetime:')) {
    const lifetime = pricing.lifetimes.find((value) => value.id === id.slice('lifetime:'.length));
    if (!lifetime || (!includeUnavailable && (!lifetime.visible || lifetime.archived))) return undefined;
    return { id, kind: 'lifetime', label: lifetime.name, priceEnv: '', tier: 'LIFETIME', credits: lifetime.credits, amountCents: Math.round(lifetime.price * 100), currency: 'usd', productName: lifetime.name, productDescription: lifetime.tagline };
  }
  // Legacy identifiers stay resolvable for existing Stripe/Safepay events.
  return PURCHASABLES.find((item) => item.id === id);
}

export function priceIdFor(item: Purchasable): string | undefined {
  const value = process.env[item.priceEnv];
  return value && value.trim() ? value.trim() : undefined;
}

/** Resolve Safepay's quote amount from SavDown's centralized pricing source. */
export async function resolveSafepayPurchase(item: Purchasable): Promise<{ amount: number; currency: 'USD' }> {
  const amount = item.amountCents;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`No valid centralized price configured for ${item.id}`);
  }
  return { amount, currency: 'USD' };
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
  paymentId?: string;
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
    paymentId,
    resetPlanCredits,
    planCreditsResetAt,
    tier,
  } = opts;

  try {
    const granted = await prisma.$transaction(async (tx) => {
      if (externalId && await tx.creditTransaction.findUnique({ where: { externalId } })) return false;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { planCredits: true, purchasedCredits: true },
      });
      if (!user) throw new Error('Credit recipient not found');

      let planCredits = user.planCredits;
      let purchasedCredits = user.purchasedCredits;
      if (bucket === 'plan' && resetPlanCredits && planCredits > 0) {
        const expired = planCredits;
        planCredits = 0;
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: -expired,
            kind: 'expiration',
            bucket: 'plan',
            description: 'Unused plan credits expired at allowance reset',
            idempotencyKey: externalId ? `${externalId}:expiration` : undefined,
            planDelta: -expired,
            planBalanceAfter: 0,
            purchasedBalanceAfter: purchasedCredits,
            balanceAfter: purchasedCredits,
          },
        });
      }

      // Negative revocations are clamped so they cannot create an impossible balance.
      const available = bucket === 'plan' ? planCredits : purchasedCredits;
      const appliedAmount = amount < 0 ? -Math.min(Math.abs(amount), available) : amount;
      if (bucket === 'plan') planCredits = resetPlanCredits ? Math.max(0, appliedAmount) : planCredits + appliedAmount;
      else purchasedCredits += appliedAmount;

      await tx.user.update({
        where: { id: userId },
        data: {
          planCredits,
          purchasedCredits,
          ...(planCreditsResetAt !== undefined ? { planCreditsResetAt } : {}),
          ...(tier ? { plan: tier } : {}),
        },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: appliedAmount,
          kind,
          bucket,
          description,
          externalId,
          paymentId,
          planDelta: bucket === 'plan' ? appliedAmount : 0,
          purchasedDelta: bucket === 'purchased' ? appliedAmount : 0,
          planBalanceAfter: planCredits,
          purchasedBalanceAfter: purchasedCredits,
          balanceAfter: planCredits + purchasedCredits,
        },
      });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { granted };
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
  // Not yet sellable (no PURCHASABLES entry / Stripe price) — the number here
  // only prevents a crash if a user's plan is ever set to MAX; update it
  // before this tier is actually offered.
  MAX: { credits: 5000, period: 'month' },
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
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const resetAt = new Date(periodStart); resetAt.setUTCDate(resetAt.getUTCDate() + 1);
    const refillKey = `free-refill:${userId}:${periodStart.toISOString().slice(0, 10)}`;

    return prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { plan: true, planCredits: true, purchasedCredits: true, planCreditsResetAt: true, role: true },
      });
      if (!current) return null;
      const stillDue = !current.planCreditsResetAt || current.planCreditsResetAt.getTime() <= Date.now();
      if (!stillDue || current.plan !== 'FREE') {
        return {
          plan: current.plan as PlanTier,
          planCredits: current.planCredits,
          purchasedCredits: current.purchasedCredits,
          totalCredits: current.planCredits + current.purchasedCredits,
          planCreditsResetAt: current.planCreditsResetAt,
          role: current.role,
        };
      }

      if (current.planCredits > 0) {
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: -current.planCredits,
            kind: 'expiration',
            bucket: 'plan',
            description: 'Unused free daily credits expired',
            idempotencyKey: `${refillKey}:expiration`,
            planDelta: -current.planCredits,
            planBalanceAfter: 0,
            purchasedBalanceAfter: current.purchasedCredits,
            balanceAfter: current.purchasedCredits,
          },
        });
      }
      await tx.user.update({ where: { id: userId }, data: { planCredits: allowance.credits, planCreditsResetAt: resetAt } });
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: allowance.credits,
          kind: 'plan_refill',
          bucket: 'plan',
          description: 'Free daily credit refill',
          idempotencyKey: refillKey,
          planDelta: allowance.credits,
          planBalanceAfter: allowance.credits,
          purchasedBalanceAfter: current.purchasedCredits,
          balanceAfter: allowance.credits + current.purchasedCredits,
        },
      });
      return {
        plan: tier,
        planCredits: allowance.credits,
        purchasedCredits: current.purchasedCredits,
        totalCredits: allowance.credits + current.purchasedCredits,
        planCreditsResetAt: resetAt,
        role: current.role,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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

export function addMonths(date: Date, months: number): Date {
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
