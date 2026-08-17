import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireCredits } from '@/lib/credits';
import { getBillingSummary } from '@/lib/billing';
import { prisma } from '@/lib/prisma';
import { getImageProvider, ImageProviderError } from '@/lib/ai-image/provider';
import { releaseAiCredits, reserveAiCredits, type AiCreditReservation } from '@/lib/ai-image/credit-reservation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const inputSchema = z.object({
  prompt: z.string().trim().min(3).max(1200),
  aspectRatio: z.enum(['1:1', '4:5', '16:9']).default('1:1'),
  quality: z.enum(['standard', 'high']).default('standard'),
  numberOfImages: z.coerce.number().int().min(1).max(4).default(1),
});

const creditCost = Math.max(1, Number(process.env.AI_IMAGE_CREDIT_COST || 5));
const maxConcurrent = Math.max(1, Number(process.env.AI_MAX_CONCURRENT_JOBS || 2));
const maxQueue = Math.max(1, Number(process.env.AI_MAX_QUEUE_SIZE || 8));
const perUserDailyLimit = Math.max(1, Number(process.env.AI_MAX_GENERATIONS_PER_USER_DAY || 20));
const perIpWindowMs = 60_000;
const perIpLimit = Math.max(1, Number(process.env.AI_MAX_REQUESTS_PER_IP_MINUTE || 6));
let activeJobs = 0;
let queuedJobs = 0;
const ipRequests = new Map<string, { startedAt: number; count: number }>();
const userRequests = new Map<string, { day: string; count: number }>();

function requestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimits(userId: string, ip: string) {
  const now = Date.now();
  const ipEntry = ipRequests.get(ip);
  const nextIp = !ipEntry || now - ipEntry.startedAt > perIpWindowMs ? { startedAt: now, count: 1 } : { ...ipEntry, count: ipEntry.count + 1 };
  ipRequests.set(ip, nextIp);
  if (nextIp.count > perIpLimit) return false;
  const day = new Date().toISOString().slice(0, 10);
  const userEntry = userRequests.get(userId);
  const nextUser = !userEntry || userEntry.day !== day ? { day, count: 1 } : { ...userEntry, count: userEntry.count + 1 };
  userRequests.set(userId, nextUser);
  return nextUser.count <= perUserDailyLimit;
}

function cleanError(error: unknown) {
  if (!(error instanceof ImageProviderError)) return { status: 500, message: 'The image could not be created. Please try again.' };
  if (error.code === 'rate_limited') return { status: 429, message: 'The image provider is busy. Please try again in a moment.' };
  if (error.code === 'timeout') return { status: 504, message: 'Image generation took too long. Your credits were not charged.' };
  if (error.code === 'invalid_request') return { status: 400, message: 'That request could not be accepted. Try a different prompt.' };
  if (error.code === 'unavailable') return { status: 503, message: 'AI generation is temporarily unavailable. Please try again later.' };
  return { status: 500, message: 'The image could not be created. Your credits were not charged.' };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: true, authenticated: false, creditCost });
  const summary = await getBillingSummary(session.user.id);
  return NextResponse.json({ ok: true, authenticated: true, credits: summary?.totalCredits ?? 0, creditCost });
}

export async function POST(request: NextRequest) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Enter a prompt of 3–1200 characters and choose valid output settings.' }, { status: 400 });
  if (activeJobs >= maxConcurrent && queuedJobs >= maxQueue) return NextResponse.json({ ok: false, error: 'AI generation is temporarily unavailable. Please try again later.' }, { status: 503 });

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: 'Sign in to use the AI Image Generator.' }, { status: 401 });
  if (!checkRateLimits(userId, requestIp(request))) return NextResponse.json({ ok: false, error: 'You have reached the current generation limit. Please try again later.' }, { status: 429 });

  const input = parsed.data;
  const totalCost = Math.ceil(creditCost * input.numberOfImages * (input.quality === 'high' ? 1.4 : 1));
  const gate = await requireCredits({ cost: totalCost });
  if (!gate.ok) return gate.response;

  if (activeJobs >= maxConcurrent && queuedJobs >= maxQueue) return NextResponse.json({ ok: false, error: 'AI generation is temporarily unavailable. Please try again later.' }, { status: 503 });
  queuedJobs += 1;
  let waitedMs = 0;
  try {
    while (activeJobs >= maxConcurrent) {
      if (waitedMs >= Number(process.env.AI_QUEUE_WAIT_TIMEOUT_MS || 45000)) return NextResponse.json({ ok: false, error: 'The generation queue is busy. Please try again later.' }, { status: 503 });
      await new Promise((resolve) => setTimeout(resolve, 250));
      waitedMs += 250;
    }
  } finally {
    queuedJobs = Math.max(0, queuedJobs - 1);
  }
  activeJobs += 1;
  const generationId = `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let reservation: AiCreditReservation | null = null;
  try {
    reservation = totalCost > 0 ? await reserveAiCredits(userId, totalCost) : { amount: 0, planCredits: 0, purchasedCredits: 0 };
    if (!reservation) return NextResponse.json({ ok: false, error: 'Your credit balance changed before generation started. Please try again.' }, { status: 402 });
    const provider = getImageProvider();
    const generated = await provider.generate(input);
    if (!generated.length) throw new ImageProviderError('failed');
    await Promise.all(generated.map((image) => prisma.download.create({ data: { platform: 'ai', tool: 'ai-image-generator', sourceUrl: `ai://${generationId}/${image.url.startsWith('data:') ? 'stored-by-provider' : image.url}`, status: 'success', userId } }).catch(() => null)));
    const summary = await getBillingSummary(userId);
    return NextResponse.json({ ok: true, generationId, images: generated.map((image, index) => ({ ...image, id: `${generationId}_${index + 1}` })), credits: summary?.totalCredits ?? 0 });
  } catch (error) {
    if (reservation && totalCost > 0) await releaseAiCredits(userId, reservation, 'AI image generation failed; credits released').catch(() => null);
    const safe = cleanError(error);
    return NextResponse.json({ ok: false, error: safe.message }, { status: safe.status });
  } finally {
    activeJobs = Math.max(0, activeJobs - 1);
  }
}
