import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';

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

  // Credit is spent upfront — client-side processing follows immediately
  if (!(await gate.spend('Background Remover'))) {
    return NextResponse.json({ error: 'Credit balance changed. Please retry.' }, { status: 402 });
  }

  return NextResponse.json({ ok: true });
}
