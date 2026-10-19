import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getPricingConfig } from '@/lib/pricing-server';
import { expireReferralRewards } from '@/lib/affiliates';
import type { PlanTier } from '@/types/plans';

/**
 * The server-side purchase catalogue.
 *
 * Admin Pricing is stored in `pricing_config` and shared by public views,
 * Safepay checkout and recurring allowance lookups. The fixed catalogue below
 * remains the compatibility map for older Stripe price IDs; payment webhooks
 * use provider metadata or the configured subscription allowance where the
 * historical Stripe product does not carry an offer snapshot.
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

// Stable identifiers and expected legacy Stripe price IDs. New Safepay checkouts
// resolve their amount and credits from the saved Admin Pricing configuration.
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

/** Reverse lookup for legacy Stripe prices. Stable provider IDs and one-off
 * purchase terms stay tied to the Stripe product; recurring allowances follow
 * the current Admin Pricing entitlement. */
export async function findByPriceId(priceId: string): Promise<Purchasable | undefined> {
  const legacy = PURCHASABLES.find((item) => priceIdFor(item) === priceId);
  if (!legacy) return undefined;

  let dynamicId: string | undefined;
  if (legacy.kind === 'subscription' && legacy.tier) {
    const pricing = await getPricingConfig();
    const plan = pricing.plans.find((value) => value.entitlementTier === legacy.tier && !value.archived)
      ?? pricing.plans.find((value) => value.entitlementTier === legacy.tier);
    if (plan) {
      const period = legacy.interval === 'year' ? 'yearly' : 'monthly';
      dynamicId = `subscription:${plan.id}:${period}`;
    }
  }
  if (!dynamicId) return legacy;

  const configured = await findPurchasable(dynamicId, true);
  return configured ? { ...legacy, ...configured, id: legacy.id, priceEnv: legacy.priceEnv } : legacy;
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
          select: { planCredits: true, purchasedCredits: true, referralCredits: true },
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
            referralBalanceAfter: user.referralCredits,
            balanceAfter: purchasedCredits + user.referralCredits,
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
          referralBalanceAfter: user.referralCredits,
          balanceAfter: planCredits + purchasedCredits + user.referralCredits,
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

export type PlanAllowance = { credits: number; period: 'day' | 'month'; name?: string; monthlyCap?: number; creditsLabel?: string; creditsNote?: string };

/** Fixed paid-tier references. The Free allowance is read from saved pricing. */
export const TIER_ALLOWANCE: Record<Exclude<PlanTier, 'FREE'>, PlanAllowance> = {
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

function tierAllowanceFromPricing(tier: PlanTier, pricing: Awaited<ReturnType<typeof getPricingConfig>>): PlanAllowance {
  if (tier === 'LIFETIME') {
    const lifetime = pricing.lifetimes.find((plan) => plan.id === 'lifetime' && !plan.archived)
      ?? pricing.lifetimes.find((plan) => !plan.archived)
      ?? pricing.lifetimes.find((plan) => plan.id === 'lifetime');
    return lifetime
      ? { credits: lifetime.credits, period: 'month', name: lifetime.name, creditsLabel: `${lifetime.credits.toLocaleString()} lifetime credits` }
      : TIER_ALLOWANCE.LIFETIME;
  }

  const plan = pricing.plans.find((value) => value.entitlementTier === tier && !value.archived)
    ?? pricing.plans.find((value) => value.entitlementTier === tier);
  if (plan) {
    if (tier === 'FREE') {
      const dailyCredits = plan.dailyCredits ?? Math.floor(plan.monthlyCredits / 30);
      return {
        credits: dailyCredits,
        period: 'day',
        name: plan.name,
        monthlyCap: plan.monthlyCredits,
        creditsLabel: `${dailyCredits.toLocaleString()} credits / day`,
        creditsNote: `up to ${plan.monthlyCredits.toLocaleString()} / month`,
      };
    }
    return {
      credits: plan.monthlyCredits,
      period: 'month',
      name: plan.name,
      creditsLabel: plan.creditsLabel ?? `${plan.monthlyCredits.toLocaleString()} credits / month`,
      creditsNote: plan.creditsNote,
    };
  }

  if (tier === 'FREE') return { credits: 0, period: 'day', name: 'Free', monthlyCap: 0, creditsLabel: '0 credits / day', creditsNote: 'up to 0 / month' };
  return TIER_ALLOWANCE[tier];
}

export async function getTierAllowance(tier: PlanTier): Promise<PlanAllowance> {
  return tierAllowanceFromPricing(tier, await getPricingConfig());
}

export type BillingSummary = {
  plan: PlanTier;
  planCredits: number;
  purchasedCredits: number;
  referralCredits: number;
  totalCredits: number;
  planName?: string;
  planAllowance: number;
  planAllowancePeriod: 'day' | 'month';
  planMonthlyCap: number | null;
  planCreditsLabel?: string;
  planCreditsNote?: string;
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
  await expireReferralRewards(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      planCredits: true,
      planCreditsResetAt: true,
      purchasedCredits: true,
      referralCredits: true,
      role: true,
    },
  });
  if (!user) return null;

  const tier = user.plan as PlanTier;
  const pricing = await getPricingConfig();
  const allowance = tierAllowanceFromPricing(tier, pricing);
  const due = !user.planCreditsResetAt || user.planCreditsResetAt.getTime() <= Date.now();
  // Only Free self-renews on read (a daily allowance). Lifetime is a finite
  // bank granted once; Pro is refilled by the paid `invoice.paid` webhook.
  const selfRenewing = tier === 'FREE';

  if (due && selfRenewing) {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const resetAt = new Date(periodStart); resetAt.setUTCDate(resetAt.getUTCDate() + 1);
    const dateKey = periodStart.toISOString().slice(0, 10);
    const refillKey = `free-refill:${userId}:${dateKey}`;
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    try {
      return await prisma.$transaction(async (tx) => {
        const current = await tx.user.findUnique({
          where: { id: userId },
          select: { plan: true, planCredits: true, purchasedCredits: true, referralCredits: true, planCreditsResetAt: true, role: true },
        });
        if (!current) return null;
        const stillDue = !current.planCreditsResetAt || current.planCreditsResetAt.getTime() <= Date.now();
        if (!stillDue || current.plan !== 'FREE') {
          const currentAllowance = tierAllowanceFromPricing(current.plan as PlanTier, pricing);
          return {
            plan: current.plan as PlanTier,
            planCredits: current.planCredits,
            purchasedCredits: current.purchasedCredits,
            referralCredits: current.referralCredits,
            totalCredits: current.planCredits + current.purchasedCredits + current.referralCredits,
            planName: currentAllowance.name,
            planAllowance: currentAllowance.credits,
            planAllowancePeriod: currentAllowance.period,
            planMonthlyCap: currentAllowance.monthlyCap ?? null,
            planCreditsLabel: currentAllowance.creditsLabel,
            planCreditsNote: currentAllowance.creditsNote,
            planCreditsResetAt: current.planCreditsResetAt,
            role: current.role,
          };
        }

        const [existingRefill, monthlyRefills] = await Promise.all([
          tx.creditTransaction.findUnique({ where: { idempotencyKey: refillKey }, select: { id: true } }),
          tx.creditTransaction.aggregate({
            where: {
              userId,
              kind: 'plan_refill',
              bucket: 'plan',
              idempotencyKey: { startsWith: `free-refill:${userId}:` },
              createdAt: { gte: monthStart },
            },
            _sum: { planDelta: true },
          }),
        ]);
        const alreadyGrantedThisMonth = monthlyRefills._sum.planDelta ?? 0;
        const remainingThisMonth = Math.max(0, (allowance.monthlyCap ?? 0) - alreadyGrantedThisMonth);
        const refillAmount = existingRefill ? 0 : Math.min(allowance.credits, remainingThisMonth);

        if (current.planCredits > 0) {
          const expirationKey = `${refillKey}:expiration`;
          const priorExpiration = await tx.creditTransaction.findUnique({ where: { idempotencyKey: expirationKey }, select: { id: true } });
          if (!priorExpiration) {
            await tx.creditTransaction.create({
              data: {
                userId,
                amount: -current.planCredits,
                kind: 'expiration',
                bucket: 'plan',
                description: 'Unused free daily credits expired',
                idempotencyKey: expirationKey,
                planDelta: -current.planCredits,
                planBalanceAfter: 0,
                purchasedBalanceAfter: current.purchasedCredits,
                referralBalanceAfter: current.referralCredits,
                balanceAfter: current.purchasedCredits + current.referralCredits,
              },
            });
          }
        }
        await tx.user.update({ where: { id: userId }, data: { planCredits: refillAmount, planCreditsResetAt: resetAt } });
        if (!existingRefill) {
          await tx.creditTransaction.create({
            data: {
              userId,
              amount: refillAmount,
              kind: 'plan_refill',
              bucket: 'plan',
              description: refillAmount > 0 ? 'Free daily credit refill' : 'Free daily credit allowance capped for this month',
              idempotencyKey: refillKey,
              planDelta: refillAmount,
              planBalanceAfter: refillAmount,
              purchasedBalanceAfter: current.purchasedCredits,
              referralBalanceAfter: current.referralCredits,
              balanceAfter: refillAmount + current.purchasedCredits + current.referralCredits,
            },
          });
        }
        return {
          plan: tier,
          planCredits: refillAmount,
          purchasedCredits: current.purchasedCredits,
          referralCredits: current.referralCredits,
          totalCredits: refillAmount + current.purchasedCredits + current.referralCredits,
          planName: allowance.name,
          planAllowance: allowance.credits,
          planAllowancePeriod: allowance.period,
          planMonthlyCap: allowance.monthlyCap ?? null,
          planCreditsLabel: allowance.creditsLabel,
          planCreditsNote: allowance.creditsNote,
          planCreditsResetAt: resetAt,
          role: current.role,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !['P2002', 'P2034'].includes(error.code)) throw error;
      // A concurrent read/refill already won the unique daily idempotency key.
      // Return the committed balance instead of retrying and granting twice.
      const refreshed = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, planCredits: true, planCreditsResetAt: true, purchasedCredits: true, referralCredits: true, role: true } });
      if (!refreshed) return null;
      const refreshedAllowance = await getTierAllowance(refreshed.plan as PlanTier);
      return summarize(refreshed, refreshedAllowance);
    }
  }

  return summarize(user, allowance);
}

function summarize(
  user: { plan: string; planCredits: number; purchasedCredits: number; referralCredits: number; planCreditsResetAt: Date | null; role: string },
  allowance: PlanAllowance,
): BillingSummary {
  return {
    plan: user.plan as PlanTier,
    planCredits: user.planCredits,
    purchasedCredits: user.purchasedCredits,
    referralCredits: user.referralCredits,
    totalCredits: user.planCredits + user.purchasedCredits + user.referralCredits,
    planName: allowance.name,
    planAllowance: allowance.credits,
    planAllowancePeriod: allowance.period,
    planMonthlyCap: allowance.monthlyCap ?? null,
    planCreditsLabel: allowance.creditsLabel,
    planCreditsNote: allowance.creditsNote,
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
