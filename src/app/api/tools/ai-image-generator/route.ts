import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireCredits } from '@/lib/credits';
import { getBillingSummary } from '@/lib/billing';
import { prisma } from '@/lib/prisma';
import { getImageProvider, ImageProviderError } from '@/lib/ai-image/provider';
import { releaseAiCredits, reserveAiCredits, type AiCreditReservation } from '@/lib/ai-image/credit-reservation';
import { getAiImageConfig } from '@/lib/ai-image-config-server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const aspectRatioSchema = z.enum(['1:1', '16:9', '9:16', '4:3', '3:2']);
const qualitySchema = z.enum(['standard', 'high']);

// Per-process backpressure only — cheap, still useful alongside the Redis-backed
// rate limits below, which are what actually stay correct across instances.
let activeJobs = 0;
let queuedJobs = 0;

function requestIp(request: NextRequest) {
  return getClientId(request);
}

function cleanError(error: unknown, maintenanceMessage: string) {
  if (!(error instanceof ImageProviderError)) return { status: 500, message: 'The image could not be created. Please try again.' };
  if (error.code === 'rate_limited') return { status: 429, message: 'The image provider is busy. Please try again in a moment.' };
  if (error.code === 'timeout') return { status: 504, message: 'Image generation took too long. Your credits were not charged.' };
  if (error.code === 'invalid_request') return { status: 400, message: 'That request could not be accepted. Try a different prompt.' };
  if (error.code === 'unavailable') return { status: 503, message: maintenanceMessage };
  return { status: 500, message: 'The image could not be created. Your credits were not charged.' };
}

async function isToolDisabled() {
  const toolConfig = await prisma.toolConfig.findUnique({ where: { slug: 'ai-image-generator' } });
  return toolConfig?.status === 'DISABLED' || toolConfig?.status === 'MAINTENANCE';
}

function maxImagesFor(plan: string, config: Awaited<ReturnType<typeof getAiImageConfig>>) {
  return plan === 'FREE' ? config.maxImagesPerRequestFree : config.maxImagesPerRequestPro;
}

export async function GET() {
  const config = await getAiImageConfig();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      creditCost: config.creditCostStandard,
      highQualityMultiplier: config.highQualityMultiplier,
      maxImagesPerRequest: config.maxImagesPerRequestFree,
    });
  }
  const summary = await getBillingSummary(session.user.id);
  return NextResponse.json({
    ok: true,
    authenticated: true,
    credits: summary?.totalCredits ?? 0,
    creditCost: config.creditCostStandard,
    highQualityMultiplier: config.highQualityMultiplier,
    maxImagesPerRequest: summary ? maxImagesFor(summary.plan, config) : config.maxImagesPerRequestFree,
  });
}

export async function POST(request: NextRequest) {
  const config = await getAiImageConfig();

  if (await isToolDisabled()) {
    return NextResponse.json({ ok: false, error: config.maintenanceMessage }, { status: 503 });
  }

  const inputSchema = z.object({
    prompt: z.string().trim().min(3).max(config.maxPromptLength),
    aspectRatio: aspectRatioSchema.default('1:1'),
    quality: qualitySchema.default('standard'),
    numberOfImages: z.coerce.number().int().min(1).max(4).default(1),
  });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: `Enter a prompt of 3–${config.maxPromptLength} characters and choose valid output settings.` },
      { status: 400 },
    );
  }

  if (activeJobs >= config.maxConcurrentJobs && queuedJobs >= config.maxQueueSize) {
    return NextResponse.json({ ok: false, error: config.maintenanceMessage }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: 'Sign in to use the AI Image Generator.' }, { status: 401 });

  const summary = await getBillingSummary(userId);
  if (!summary) return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 401 });

  const input = parsed.data;
  const allowedImages = maxImagesFor(summary.plan, config);
  if (input.numberOfImages > allowedImages) {
    return NextResponse.json(
      { ok: false, error: `Your plan allows up to ${allowedImages} image${allowedImages === 1 ? '' : 's'} per request. Upgrade for more.` },
      { status: 403 },
    );
  }

  const ip = requestIp(request);
  const ipLimit = await ratelimit(`ai-image:ip:${ip}`, { limit: config.rateLimitPerIpPerMinute, windowSeconds: 60 });
  if (!ipLimit.success) {
    return NextResponse.json({ ok: false, error: 'You have reached the current generation limit. Please try again later.' }, { status: 429 });
  }
  if (summary.plan === 'FREE') {
    const day = new Date().toISOString().slice(0, 10);
    const dailyLimit = await ratelimit(`ai-image:user:${userId}:${day}`, { limit: config.freeDailyLimit, windowSeconds: 86400 });
    if (!dailyLimit.success) {
      return NextResponse.json({ ok: false, error: `Free accounts get ${config.freeDailyLimit} image generations per day. Upgrade for more, or try again tomorrow.` }, { status: 429 });
    }
  }

  // Durable (cross-instance) duplicate-click guard: only one in-flight generation per user at a time.
  const redis = getRedis();
  const inflightKey = `ai-image:inflight:${userId}`;
  if (redis) {
    const acquired = await redis.setNx(inflightKey, '1', 90);
    if (!acquired) {
      return NextResponse.json({ ok: false, error: 'A generation is already in progress for your account. Please wait for it to finish.' }, { status: 429 });
    }
  }

  const totalCost = Math.ceil(config.creditCostStandard * input.numberOfImages * (input.quality === 'high' ? config.highQualityMultiplier : 1));
  const gate = await requireCredits({ cost: totalCost });
  if (!gate.ok) {
    if (redis) await redis.del(inflightKey).catch(() => null);
    return gate.response;
  }

  if (activeJobs >= config.maxConcurrentJobs && queuedJobs >= config.maxQueueSize) {
    if (redis) await redis.del(inflightKey).catch(() => null);
    return NextResponse.json({ ok: false, error: config.maintenanceMessage }, { status: 503 });
  }
  queuedJobs += 1;
  let waitedMs = 0;
  try {
    while (activeJobs >= config.maxConcurrentJobs) {
      if (waitedMs >= Number(process.env.AI_QUEUE_WAIT_TIMEOUT_MS || 45000)) {
        if (redis) await redis.del(inflightKey).catch(() => null);
        return NextResponse.json({ ok: false, error: 'The generation queue is busy. Please try again later.' }, { status: 503 });
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
      waitedMs += 250;
    }
  } finally {
    queuedJobs = Math.max(0, queuedJobs - 1);
  }
  activeJobs += 1;
  const generationId = `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let reservation: AiCreditReservation | null = null;
  const model = input.quality === 'high' ? config.highModel : config.standardModel;
  try {
    reservation = totalCost > 0 ? await reserveAiCredits(userId, totalCost) : { amount: 0, planCredits: 0, purchasedCredits: 0 };
    if (!reservation) return NextResponse.json({ ok: false, error: 'Your credit balance changed before generation started. Please try again.' }, { status: 402 });

    const provider = getImageProvider();
    const generated = await provider.generate(input);
    if (!generated.length) throw new ImageProviderError('failed');

    await Promise.all([
      ...generated.map((image) => prisma.download.create({ data: { platform: 'ai', tool: 'ai-image-generator', sourceUrl: `ai://${generationId}/${image.url.startsWith('data:') ? 'stored-by-provider' : image.url}`, status: 'success', userId } }).catch(() => null)),
      prisma.aiImageGeneration.create({
        data: {
          userId,
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          quality: input.quality,
          model,
          numberOfImages: input.numberOfImages,
          creditsUsed: totalCost,
          status: 'success',
        },
      }).catch(() => null),
    ]);

    const updatedSummary = await getBillingSummary(userId);
    return NextResponse.json({ ok: true, generationId, images: generated.map((image, index) => ({ ...image, id: `${generationId}_${index + 1}` })), credits: updatedSummary?.totalCredits ?? 0 });
  } catch (error) {
    if (reservation && totalCost > 0) await releaseAiCredits(userId, reservation, 'AI image generation failed; credits released').catch(() => null);
    const safe = cleanError(error, config.maintenanceMessage);
    await prisma.aiImageGeneration.create({
      data: {
        userId,
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        quality: input.quality,
        model,
        numberOfImages: input.numberOfImages,
        creditsUsed: 0,
        status: 'failed',
        failureReason: safe.message,
      },
    }).catch(() => null);
    return NextResponse.json({ ok: false, error: safe.message }, { status: safe.status });
  } finally {
    activeJobs = Math.max(0, activeJobs - 1);
    if (redis) await redis.del(inflightKey).catch(() => null);
  }
}
