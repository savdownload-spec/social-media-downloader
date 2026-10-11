import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST, requestIdempotencyKey } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tools/image/image-upscaler
 * Credit-only endpoint. All image upscaling is done client-side via Canvas API.
 */
export async function POST(req: Request) {
  const rl = await ratelimit(`img-upscale:${getClientId(req)}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  const gate = await requireCredits({ cost: JOB_COST.imageTool });
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({})) as { action?: string };
  if (!body.action || body.action === 'authorize') return NextResponse.json({ ok: true, authorized: true });
  const operation = { tool: 'image-upscaler', platform: 'image', sourceUrl: 'browser://image-upscaler', idempotencyKey: requestIdempotencyKey(req) };
  if (body.action === 'failed') {
    await gate.fail({ ...operation, failureReason: 'Browser-side image upscaling failed' });
    return NextResponse.json({ ok: true });
  }
  if (body.action !== 'complete') return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  if (!(await gate.spend({ ...operation, description: 'Image Upscaler' }))) {
    return NextResponse.json({ error: 'Credit balance changed. Please retry.' }, { status: 402 });
  }

  return NextResponse.json({ ok: true });
}
