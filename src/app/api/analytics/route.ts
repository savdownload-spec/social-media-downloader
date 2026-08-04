import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ratelimit, getClientId } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1).max(500),
  referrer: z.string().max(500).optional(),
  meta: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const rl = await ratelimit(`an:${getClientId(req)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ ok: false }, { status: 429 });

  try {
    const body = Body.parse(await req.json());
    await prisma.analyticsEvent.create({
      data: {
        name:     body.name,
        path:     body.path,
        referrer: body.referrer,
        // The schema stores arbitrary metadata as a JSON string column
        // (metaJson String?), so we serialise here rather than using a Json type.
        metaJson: body.meta ? JSON.stringify(body.meta) : null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
