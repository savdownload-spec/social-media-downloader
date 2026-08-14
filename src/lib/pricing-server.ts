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
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  monthlyPrice: z.number(),
  yearlyPrice: z.number(),
  monthlyCredits: z.number(),
  creditsLabel: z.string().optional(),
  creditsNote: z.string().optional(),
  features: z.array(z.string()),
  popular: z.boolean().optional(),
  order: z.number(),
  visible: z.boolean(),
});

const packSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  credits: z.number(),
  price: z.number(),
  bonus: z.number().optional(),
  order: z.number(),
  visible: z.boolean(),
});

const lifetimeSchema = z.object({
  name: z.string(),
  price: z.number(),
  credits: z.number(),
  tagline: z.string(),
  benefits: z.array(z.string()),
  fairUse: z.array(z.string()),
  visible: z.boolean(),
});

export const pricingConfigSchema = z.object({
  plans: z.array(planSchema).min(1),
  packs: z.array(packSchema),
  lifetime: lifetimeSchema,
});

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
