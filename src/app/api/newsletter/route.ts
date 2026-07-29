import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ratelimit, getClientId } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ email: z.string().email().max(254) });

export async function POST(req: Request) {
  const rl = await ratelimit(`nl:${getClientId(req)}`, { limit: 5, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const { email } = Body.parse(await req.json());
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { active: true },
      create: { email },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
}
