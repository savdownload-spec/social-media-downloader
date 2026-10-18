import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { recordRejectedOperation, recordToolOperation, requireCredits, requestIdempotencyKey } from '@/lib/credits';
import { getBillingSummary } from '@/lib/billing';
import { prisma } from '@/lib/prisma';
import { getImageProvider, ImageProviderError } from '@/lib/ai-image/provider';
import { releaseAiCredits, reserveAiCredits, type AiCreditReservation } from '@/lib/ai-image/credit-reservation';
import { getAiImageConfig } from '@/lib/ai-image-config-server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { getRedis } from '@/lib/redis';
import { requireToolAvailable } from '@/lib/toolStatus';

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
  if (!(error instanceof ImageProviderError)) return { status: 500, code: 'processing_failed', message: 'The image could not be created. Please try again.' };
  if (error.code === 'rate_limited') return { status: 429, code: 'provider_rate_limited', message: 'The image provider is busy. Please try again in a moment.' };
  if (error.code === 'timeout') return { status: 504, code: 'processing_timeout', message: 'Image generation took too long. Your credits were not charged.' };
  if (error.code === 'invalid_request') return { status: 400, code: 'provider_validation_failed', message: 'That request could not be accepted. Try a different prompt.' };
  if (error.code === 'unavailable') return { status: 503, code: 'provider_unavailable', message: maintenanceMessage };
  return { status: 500, code: 'processing_failed', message: 'The image could not be created. Your credits were not charged.' };
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
  const requestKey = requestIdempotencyKey(request);

  const inputSchema = z.object({
    tool: z.enum(['ai-image-generator', 'ai-thumbnail-generator']).default('ai-image-generator'),
    prompt: z.string().trim().min(3).max(config.maxPromptLength),
    aspectRatio: aspectRatioSchema.default('1:1'),
    quality: qualitySchema.default('standard'),
    numberOfImages: z.coerce.number().int().min(1).max(4).default(1),
  });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    await recordRejectedOperation(request, {
      tool: 'ai-image-generator', platform: 'ai', sourceUrl: 'tool://ai-image-generator', idempotencyKey: requestKey,
    }, 'validation_failed', 'Invalid AI image request');
    return NextResponse.json(
      { ok: false, error: `Enter a prompt of 3–${config.maxPromptLength} characters and choose valid output settings.` },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const operation = {
    tool: input.tool,
    platform: 'ai',
    sourceUrl: `tool://${input.tool}`,
    idempotencyKey: requestKey,
  };

  /* ── Tool status gate — covers COMING_SOON, MAINTENANCE, DISABLED for both tool slugs ── */
  const statusGate = await requireToolAvailable(input.tool);
  if (!statusGate.ok) {
    await recordRejectedOperation(request, operation, 'tool_unavailable', 'Tool is not available');
    return statusGate.response;
  }

  if (activeJobs >= config.maxConcurrentJobs && queuedJobs >= config.maxQueueSize) {
    await recordRejectedOperation(request, operation, 'queue_full', 'Generation queue is full');
    return NextResponse.json({ ok: false, error: config.maintenanceMessage }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    await recordRejectedOperation(request, operation, 'auth_required', 'Authentication required');
    return NextResponse.json({ ok: false, error: 'Sign in to use the AI Image Generator.' }, { status: 401 });
  }

  const summary = await getBillingSummary(userId);
  if (!summary) {
    await recordRejectedOperation(request, operation, 'account_not_found', 'Account not found');
    return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 401 });
  }

  const allowedImages = maxImagesFor(summary.plan, config);
  if (input.numberOfImages > allowedImages) {
    await recordToolOperation(userId, { ...operation, status: 'failed', failureCode: 'plan_limit_exceeded', failureReason: 'Requested image count exceeds plan limit' });
    return NextResponse.json(
      { ok: false, error: `Your plan allows up to ${allowedImages} image${allowedImages === 1 ? '' : 's'} per request. Upgrade for more.` },
      { status: 403 },
    );
  }

  const ip = requestIp(request);
  const ipLimit = await ratelimit(`ai-image:ip:${ip}`, { limit: config.rateLimitPerIpPerMinute, windowSeconds: 60 });
  if (!ipLimit.success) {
    await recordToolOperation(userId, { ...operation, status: 'failed', failureCode: 'rate_limited', failureReason: 'Rate limit exceeded' });
    return NextResponse.json({ ok: false, error: 'You have reached the current generation limit. Please try again later.' }, { status: 429 });
  }
  if (summary.plan === 'FREE') {
    const day = new Date().toISOString().slice(0, 10);
    const dailyLimit = await ratelimit(`ai-image:user:${userId}:${day}`, { limit: config.freeDailyLimit, windowSeconds: 86400 });
    if (!dailyLimit.success) {
      await recordToolOperation(userId, { ...operation, status: 'failed', failureCode: 'daily_limit_exceeded', failureReason: 'Daily generation limit exceeded' });
      return NextResponse.json({ ok: false, error: `Free accounts get ${config.freeDailyLimit} image generations per day. Upgrade for more, or try again tomorrow.` }, { status: 429 });
    }
  }

  // Durable (cross-instance) duplicate-click guard: only one in-flight generation per user at a time.
  const redis = getRedis();
  const inflightKey = `ai-image:inflight:${userId}`;
  if (redis) {
    const acquired = await redis.setNx(inflightKey, '1', 90);
    if (!acquired) {
      await recordToolOperation(userId, { ...operation, status: 'failed', failureCode: 'duplicate_in_progress', failureReason: 'Another generation is in progress' });
      return NextResponse.json({ ok: false, error: 'A generation is already in progress for your account. Please wait for it to finish.' }, { status: 429 });
    }
  }

  const totalCost = Math.ceil(config.creditCostStandard * input.numberOfImages * (input.quality === 'high' ? config.highQualityMultiplier : 1));
  const gate = await requireCredits({ cost: totalCost, request, operation });
  if (!gate.ok) {
    if (redis) await redis.del(inflightKey).catch(() => null);
    return gate.response;
  }

  if (activeJobs >= config.maxConcurrentJobs && queuedJobs >= config.maxQueueSize) {
    await gate.fail({ ...operation, failureCode: 'queue_full', failureReason: 'Generation queue is full' });
    if (redis) await redis.del(inflightKey).catch(() => null);
    return NextResponse.json({ ok: false, error: config.maintenanceMessage }, { status: 503 });
  }
  queuedJobs += 1;
  let waitedMs = 0;
  try {
    while (activeJobs >= config.maxConcurrentJobs) {
      if (waitedMs >= Number(process.env.AI_QUEUE_WAIT_TIMEOUT_MS || 45000)) {
        await gate.fail({ ...operation, failureCode: 'queue_timeout', failureReason: 'Generation queue wait timed out' });
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
    reservation = totalCost > 0 ? await reserveAiCredits(userId, totalCost, {
      tool: input.tool,
      platform: 'ai',
      sourceUrl: `ai://${generationId}`,
      description: 'AI image generation reservation',
      idempotencyKey: requestKey,
    }) : null;
    if (!reservation) {
      await gate.fail({ ...operation, failureCode: 'credit_commit_failed', failureReason: 'Credit balance changed before generation started' });
      return NextResponse.json({ ok: false, error: 'Your credit balance changed before generation started. Please try again.' }, { status: 402 });
    }
    if (reservation.duplicate) return NextResponse.json({ ok: false, error: 'This generation request was already processed.' }, { status: 409 });

    await prisma.download.update({
      where: { id: reservation.operationId },
      data: { status: 'processing', failureCode: null, failureReason: null },
    });

    const provider = getImageProvider();
    const generated = await provider.generate(input);
    if (!generated.length) throw new ImageProviderError('failed');

    await prisma.$transaction([
      prisma.download.update({
        where: { id: reservation.operationId },
        data: { status: 'success', completedAt: new Date(), failureReason: null },
      }),
      prisma.aiImageGeneration.create({
        data: {
          userId,
          operationId: reservation.operationId,
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          quality: input.quality,
          model,
          numberOfImages: input.numberOfImages,
          creditsUsed: totalCost,
          status: 'success',
        },
      }),
    ]);

    const updatedSummary = await getBillingSummary(userId);
    return NextResponse.json({ ok: true, generationId, images: generated.map((image, index) => ({ ...image, id: `${generationId}_${index + 1}` })), credits: updatedSummary?.totalCredits ?? 0 });
  } catch (error) {
    const safe = cleanError(error, config.maintenanceMessage);
    if (reservation && totalCost > 0) await releaseAiCredits(userId, reservation, 'AI image generation failed; credits released', safe.code).catch(() => null);
    await prisma.aiImageGeneration.create({
      data: {
        userId,
        operationId: reservation?.operationId,
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
