import { NextResponse } from 'next/server';
import { requireCredits, JOB_COST, requestIdempotencyKey } from '@/lib/credits';
import { requireToolAvailable } from '@/lib/toolStatus';
import { checkImageIpLimit, checkImageUserLimit } from '@/lib/imageRateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tools/image/background-remover
 * Credit-only endpoint for background removal.
 * All image processing happens client-side via @imgly/background-removal.
 * This route only handles authentication + credit deduction.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { action?: string };
  const action = body.action ?? 'authorize';
  if (!['authorize', 'complete', 'failed'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  }
  const operationKey = requestIdempotencyKey(req);
  if (!operationKey) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }
  const ipLimited = await checkImageIpLimit(req, `background-remover:${action}`, { limit: action === 'authorize' ? 10 : 20, windowSeconds: 60 });
  if (ipLimited) return ipLimited;

  /* ── Tool status gate — reject before credits are charged ── */
  const statusGate = await requireToolAvailable('background-remover');
  if (!statusGate.ok) return statusGate.response;

  const operation = { tool: 'background-remover', platform: 'image', sourceUrl: 'browser://background-remover', idempotencyKey: operationKey };
  const gate = await requireCredits({ cost: JOB_COST.imageTool, request: req, operation });
  if (!gate.ok) return gate.response;
  const userLimited = await checkImageUserLimit(gate.userId, `background-remover:${action}`, { limit: action === 'authorize' ? 8 : 20, windowSeconds: 60 });
  if (userLimited) return userLimited;

  if (action === 'authorize') return NextResponse.json({ ok: true, authorized: true });
  if (action === 'failed') {
    await gate.fail({ ...operation, failureReason: 'Browser-side background removal failed' });
    return NextResponse.json({ ok: true });
  }
  if (!(await gate.spend({ ...operation, description: 'Background Remover' }))) {
    return NextResponse.json({ error: 'Credit balance changed. Please retry.' }, { status: 402 });
  }

  return NextResponse.json({ ok: true });
}
