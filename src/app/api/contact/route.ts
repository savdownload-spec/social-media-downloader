import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ratelimit, getClientId } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().max(120).optional().default(''),
  email: z.string().email().max(254),
  subject: z.string().max(200).optional().default(''),
  message: z.string().min(3).max(5000),
});

export async function POST(req: Request) {
  const rl = await ratelimit(`ct:${getClientId(req)}`, { limit: 3, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = Body.parse(await req.json());
    await prisma.contactMessage.create({ data: body });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
