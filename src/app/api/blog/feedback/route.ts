import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { z } from 'zod';
import { createHash } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const feedbackSchema = z.object({
  slug: z.string().min(1).max(200),
  helpful: z.boolean(),
});

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export async function POST(req: NextRequest) {
  const clientId = getClientId(req);
  const rl = await ratelimit(`feedback:${clientId}`, { limit: 5, windowSeconds: 3600, fallbackToMemory: true });
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.resetSeconds) },
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const { slug, helpful } = parsed.data;
  const ipHash = clientId ? hashIp(clientId) : null;

  try {
    await prisma.articleFeedback.create({
      data: { postSlug: slug, helpful, ipHash },
    });
  } catch {
    // Non-critical — don't surface DB errors to end users
  }

  return NextResponse.json({ ok: true });
}
