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

const planSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/),
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(200),
  description: z.string().trim().max(1000).optional(),
  monthlyPrice: z.number().finite().nonnegative(),
  yearlyPrice: z.number().finite().nonnegative(),
  monthlyCredits: z.number().int().nonnegative(),
  creditsLabel: z.string().optional(),
  creditsNote: z.string().optional(),
  features: z.array(z.string().trim().min(1).max(200)),
  popular: z.boolean().optional(),
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
  order: z.number().int().nonnegative(),
  visible: z.boolean(),
  archived: z.boolean().optional().default(false),
});

const currentPricingConfigSchema = z.object({
  plans: z.array(planSchema).min(1),
  packs: z.array(packSchema),
  lifetimes: z.array(lifetimeSchema),
}).superRefine((config, ctx) => {
  const ids = [...config.plans, ...config.packs, ...config.lifetimes].map((item) => item.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Every pricing item must have a unique stable ID.' });
  if (config.plans.filter((plan) => plan.popular && !plan.archived).length > 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Only one subscription plan can be marked popular.' });
  config.plans.forEach((plan, index) => {
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
    };
  }) : legacy.plans;
  if (!Array.isArray(legacy.lifetimes) && legacy.lifetime && typeof legacy.lifetime === 'object') {
    return { ...legacy, plans, lifetimes: [{ id: 'lifetime', order: 0, ...(legacy.lifetime as object) }] };
  }
  return { ...legacy, plans };
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
