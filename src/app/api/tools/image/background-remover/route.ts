import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST, requestIdempotencyKey } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tools/image/background-remover
 * Credit-only endpoint for background removal.
 * All image processing happens client-side via @imgly/background-removal.
 * This route only handles authentication + credit deduction.
 */
export async function POST(req: Request) {
  const rl = await ratelimit(`bg-remove:${getClientId(req)}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  const gate = await requireCredits({ cost: JOB_COST.qrTool });
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({})) as { action?: string };
  if (!body.action || body.action === 'authorize') return NextResponse.json({ ok: true, authorized: true });
  const operation = { tool: 'background-remover', platform: 'image', sourceUrl: 'browser://background-remover', idempotencyKey: requestIdempotencyKey(req) };
  if (body.action === 'failed') {
    await gate.fail({ ...operation, failureReason: 'Browser-side background removal failed' });
    return NextResponse.json({ ok: true });
  }
  if (body.action !== 'complete') return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  if (!(await gate.spend({ ...operation, description: 'Background Remover' }))) {
    return NextResponse.json({ error: 'Credit balance changed. Please retry.' }, { status: 402 });
  }

  return NextResponse.json({ ok: true });
}
