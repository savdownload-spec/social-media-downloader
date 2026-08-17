import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { DEFAULT_AI_IMAGE_CONFIG, type AiImageConfig } from '@/config/aiImage';

/**
 * The server-side source of truth for AI Image Generator settings.
 *
 * `adminSetting.ai_image_config` holds the admin-edited model. This reads it,
 * validates it against the current shape, and falls back to
 * DEFAULT_AI_IMAGE_CONFIG when the row is missing, malformed, or from an
 * older schema — mirrors `@/lib/pricing-server` exactly so the two never
 * drift in behavior. Provider credentials (CLOUDFLARE_ACCOUNT_ID /
 * CLOUDFLARE_API_TOKEN) are never part of this config — they stay in
 * server-only environment variables.
 */

export const AI_IMAGE_SETTING_KEY = 'ai_image_config';
export const AI_IMAGE_CACHE_TAG = 'ai-image-config';

export const aiImageConfigSchema = z.object({
  maintenanceMessage: z.string().min(1).max(300),
  standardModel: z.string().min(1),
  highModel: z.string().min(1),
  highModelSteps: z.number().int().min(10).max(50),
  creditCostStandard: z.number().int().min(1).max(1000),
  highQualityMultiplier: z.number().min(1).max(5),
  freeDailyLimit: z.number().int().min(0).max(1000),
  maxImagesPerRequestFree: z.number().int().min(1).max(4),
  maxImagesPerRequestPro: z.number().int().min(1).max(4),
  maxPromptLength: z.number().int().min(3).max(4000),
  rateLimitPerIpPerMinute: z.number().int().min(1).max(120),
  timeoutMs: z.number().int().min(5000).max(120000),
  maxConcurrentJobs: z.number().int().min(1).max(50),
  maxQueueSize: z.number().int().min(1).max(200),
});

async function readAiImageConfigFromDb(): Promise<AiImageConfig> {
  try {
    const row = await prisma.adminSetting.findUnique({ where: { key: AI_IMAGE_SETTING_KEY } });
    if (!row) return DEFAULT_AI_IMAGE_CONFIG;
    const parsed = aiImageConfigSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : DEFAULT_AI_IMAGE_CONFIG;
  } catch {
    // Bad JSON, unreachable database, or an older stored shape → safe default.
    return DEFAULT_AI_IMAGE_CONFIG;
  }
}

const getCachedAiImageConfig = unstable_cache(readAiImageConfigFromDb, ['ai-image-config'], {
  tags: [AI_IMAGE_CACHE_TAG],
  revalidate: 300,
});

/** The single entry point every server surface uses to read AI Image Generator settings. */
export async function getAiImageConfig(): Promise<AiImageConfig> {
  return getCachedAiImageConfig();
}

/** Call after an admin writes new settings so every surface picks it up. */
export function revalidateAiImageConfig(): void {
  revalidateTag(AI_IMAGE_CACHE_TAG);
}
