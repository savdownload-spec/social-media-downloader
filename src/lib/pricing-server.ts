import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PRICING, type PricingConfig } from '@/config/pricing';

/**
 * The server-side source of truth for pricing.
 *
 * `adminSetting.pricing_config` holds the admin-edited model. This reads it,
 * validates it against the current shape, and falls back to DEFAULT_PRICING
 * when the row is missing, malformed, or from an older schema — so the public
 * site is never broken by bad or stale stored data, and an admin edit takes
 * effect everywhere on the next load (the cache is busted on save).
 *
 * The read is wrapped in `unstable_cache` so it does not hit the database on
 * every render across the whole site, and in try/catch so an unreachable
 * database degrades to the default rather than erroring the page.
 */

export const PRICING_SETTING_KEY = 'pricing_config';
export const PRICING_CACHE_TAG = 'pricing';

const promotionDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Use a valid calendar date.');

const promotionSchema = z.object({
  enabled: z.boolean().default(false),
  text: z.string().trim().max(120).default(''),
  badge: z.string().trim().max(40).optional(),
  startsOn: promotionDateSchema.optional(),
  endsOn: promotionDateSchema.optional(),
}).superRefine((promotion, ctx) => {
  if (promotion.enabled && !promotion.text) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['text'], message: 'Promotion text is required when enabled.' });
  if (promotion.startsOn && promotion.endsOn && promotion.startsOn > promotion.endsOn) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsOn'], message: 'End date must be on or after the start date.' });
  }
});

const planSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/),
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(200),
  description: z.string().trim().max(1000).optional(),
  monthlyPrice: z.number().finite().nonnegative(),
  yearlyPrice: z.number().finite().nonnegative(),
  monthlyCredits: z.number().int().nonnegative(),
  dailyCredits: z.number().int().nonnegative().optional(),
  creditsLabel: z.string().optional(),
  creditsNote: z.string().optional(),
  features: z.array(z.string().trim().min(1).max(200)),
  popular: z.boolean().optional(),
  promotions: z.object({ monthly: promotionSchema.optional(), yearly: promotionSchema.optional() }).optional(),
  billingIntervals: z.array(z.enum(['monthly', 'yearly'])).min(1).default(['monthly', 'yearly']),
  entitlementTier: z.enum(['FREE', 'PRO', 'MAX']).default('PRO'),
  order: z.number().int().nonnegative(),
  visible: z.boolean(),
  archived: z.boolean().optional().default(false),
});

const packSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/),
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(200),
  credits: z.number().int().positive(),
  price: z.number().finite().nonnegative(),
  bonus: z.number().int().nonnegative().optional(),
  promotion: promotionSchema.optional(),
  order: z.number().int().nonnegative(),
  visible: z.boolean(),
  archived: z.boolean().optional().default(false),
});

const lifetimeSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/),
  name: z.string().trim().min(1).max(80),
  price: z.number().finite().nonnegative(),
  credits: z.number().int().positive(),
  tagline: z.string().trim().max(200),
  benefits: z.array(z.string().trim().min(1).max(200)),
  fairUse: z.array(z.string().trim().min(1).max(300)),
  promotion: promotionSchema.optional(),
  order: z.number().int().nonnegative(),
  visible: z.boolean(),
  archived: z.boolean().optional().default(false),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeLegacyLifetime(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const { credits, benefits } = value;
  if (typeof credits !== 'number' || !Number.isFinite(credits) || credits < 0 || !Array.isArray(benefits)) return value;
  return {
    ...value,
    benefits: benefits.map((benefit: unknown) => benefit === '30,000 lifetime credits'
      ? `${credits.toLocaleString()} lifetime credits`
      : benefit),
  };
}

const currentPricingConfigSchema = z.object({
  plans: z.array(planSchema).min(1),
  packs: z.array(packSchema),
  lifetimes: z.array(lifetimeSchema),
}).superRefine((config, ctx) => {
  const ids = [...config.plans, ...config.packs, ...config.lifetimes].map((item) => item.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Every pricing item must have a unique stable ID.' });
  if (!config.plans.some((plan) => plan.entitlementTier === 'FREE')) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Keep a FREE entitlement configured for existing Free accounts.' });
  if (config.plans.filter((plan) => plan.popular && !plan.archived).length > 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Only one subscription plan can be marked popular.' });
  if (config.plans.filter((plan) => plan.entitlementTier === 'FREE' && !plan.archived).length > 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Only one active subscription plan can use the FREE entitlement.' });
  config.plans.forEach((plan, index) => {
    if (plan.entitlementTier === 'FREE' && (plan.monthlyPrice !== 0 || plan.yearlyPrice !== 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plans', index, 'monthlyPrice'], message: 'A FREE entitlement must have zero monthly and yearly prices.' });
    if (plan.entitlementTier === 'FREE' && (plan.dailyCredits ?? 0) > plan.monthlyCredits) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plans', index, 'dailyCredits'], message: 'Daily credits cannot exceed the monthly cap.' });
    if (plan.billingIntervals.includes('monthly') && plan.entitlementTier !== 'FREE' && plan.monthlyPrice <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plans', index, 'monthlyPrice'], message: 'Monthly price must be greater than zero.' });
    if (plan.billingIntervals.includes('yearly') && plan.entitlementTier !== 'FREE' && plan.yearlyPrice <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plans', index, 'yearlyPrice'], message: 'Yearly price must be greater than zero.' });
  });
  config.packs.forEach((pack, index) => {
    if (pack.visible && !pack.archived && pack.price <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['packs', index, 'price'], message: 'A visible credit pack must have a price greater than zero.' });
  });
  config.lifetimes.forEach((plan, index) => {
    if (plan.visible && !plan.archived && plan.price <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lifetimes', index, 'price'], message: 'A visible lifetime plan must have a price greater than zero.' });
  });
});

export const pricingConfigSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object') return input;
  const legacy = input as Record<string, unknown>;
  const plans = Array.isArray(legacy.plans) ? legacy.plans.map((value) => {
    if (!value || typeof value !== 'object') return value;
    const plan = value as Record<string, unknown>;
    return {
      ...plan,
      billingIntervals: plan.billingIntervals ?? ['monthly', 'yearly'],
      entitlementTier: plan.entitlementTier ?? (plan.monthlyPrice === 0 && plan.yearlyPrice === 0 ? 'FREE' : 'PRO'),
      ...(plan.entitlementTier === 'FREE' || (plan.entitlementTier == null && plan.monthlyPrice === 0 && plan.yearlyPrice === 0)
        ? (() => {
            const labelCredits = typeof plan.creditsLabel === 'string'
              ? /^(\s*[\d,]+)\s+credits?\s*\/\s*day\b/i.exec(plan.creditsLabel)?.[1]?.replace(/,/g, '')
              : undefined;
            const dailyCredits = plan.dailyCredits ?? (labelCredits !== undefined
              ? Number(labelCredits)
              : Math.floor(Number(plan.monthlyCredits ?? 0) / 30));
            const validDailyCredits = typeof dailyCredits === 'number' && Number.isInteger(dailyCredits) && dailyCredits >= 0;
            return {
              dailyCredits,
              creditsLabel: validDailyCredits ? `${dailyCredits.toLocaleString()} credits / day` : plan.creditsLabel,
              creditsNote: validDailyCredits && typeof plan.monthlyCredits === 'number' ? `up to ${plan.monthlyCredits.toLocaleString()} / month` : plan.creditsNote,
            };
          })()
        : {}),
    };
  }) : legacy.plans;
  const lifetimes = Array.isArray(legacy.lifetimes) ? legacy.lifetimes.map(normalizeLegacyLifetime) : legacy.lifetimes;
  if (!Array.isArray(lifetimes) && legacy.lifetime && typeof legacy.lifetime === 'object') {
    return { ...legacy, plans, lifetimes: [normalizeLegacyLifetime({ id: 'lifetime', order: 0, ...(legacy.lifetime as object) })] };
  }
  return { ...legacy, plans, lifetimes };
}, currentPricingConfigSchema);

async function readPricingFromDb(): Promise<PricingConfig> {
  try {
    const row = await prisma.adminSetting.findUnique({ where: { key: PRICING_SETTING_KEY } });
    if (!row) return DEFAULT_PRICING;
    const parsed = pricingConfigSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : DEFAULT_PRICING;
  } catch {
    // Bad JSON, unreachable DB, or an older stored shape → safe default.
    return DEFAULT_PRICING;
  }
}

const getCachedPricing = unstable_cache(readPricingFromDb, ['pricing-config'], {
  tags: [PRICING_CACHE_TAG],
  revalidate: 300,
});

/** The single entry point every server surface uses to read pricing. */
export async function getPricingConfig(): Promise<PricingConfig> {
  return getCachedPricing();
}

/** Call after an admin writes new pricing so every surface picks it up. */
export function revalidatePricing(): void {
  revalidateTag(PRICING_CACHE_TAG);
}
