import { NextResponse } from 'next/server';
import { requireCredits, JOB_COST, requestIdempotencyKey } from '@/lib/credits';
import { requireToolAvailable } from '@/lib/toolStatus';
import { checkImageIpLimit, checkImageUserLimit } from '@/lib/imageRateLimit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateUpscaleDimensions } from '@/lib/upscaler/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function readReceipt(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new Error('Request too large.'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/**
 * POST /api/tools/image/image-upscaler
 * Credit-only endpoint. ESRGAN inference and PNG verification run in a browser worker.
 * Client completion is a browser receipt, not cryptographic proof of model execution.
 */
export async function POST(req: Request) {
  if (Number(req.headers.get('content-length')) > 4096) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
  let body: { action?: string; result?: { width: number; height: number; scale: number; bytes: number; mime: string } };
  try { body = await readReceipt(req); }
  catch (error) { return NextResponse.json({ error: 'Invalid or oversized request.' }, { status: error instanceof SyntaxError ? 400 : 413 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const action = body.action ?? '';
  if (!['authorize', 'complete', 'failed'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  }
  const operationKey = requestIdempotencyKey(req);
  if (!operationKey) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }
  const ipLimited = await checkImageIpLimit(req, `image-upscaler:${action}`, { limit: action === 'authorize' ? 15 : 30, windowSeconds: 60 });
  if (ipLimited) return ipLimited;

  /* ── Tool status gate — reject before credits are charged ── */
  const statusGate = await requireToolAvailable('image-upscaler');
  if (!statusGate.ok) return statusGate.response;

  if (action === 'complete') {
    try {
      const result = body.result;
      if (!result || result.mime !== 'image/png' || !Number.isInteger(result.bytes) || result.bytes < 1 || result.bytes > 20 * 1024 * 1024) throw new Error('Missing generated PNG receipt.');
      validateUpscaleDimensions(result.width / result.scale, result.height / result.scale, result.scale);
    } catch {
      return NextResponse.json({ error: 'A valid generated PNG receipt is required.' }, { status: 400 });
    }
    // A retry must succeed even when the first debit used the last credit.
    // Authenticate before looking up the user-scoped operation; never expose another user's receipt.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Sign in to complete processing.' }, { status: 401 });
    const previous = await prisma.download.findUnique({ where: { idempotencyKey: `${session.user.id}:${operationKey}` }, select: { userId: true, tool: true, status: true } });
    if (previous?.userId !== session.user.id || previous.tool !== 'image-upscaler') return NextResponse.json({ error: 'Authorize this operation before completing it.' }, { status: 409 });
    if (previous.status === 'success') return NextResponse.json({ ok: true, duplicate: true });
    if (previous.status !== 'processing') return NextResponse.json({ error: 'This operation is not processing. Please retry.' }, { status: 409 });
  }

  const operation = { tool: 'image-upscaler', platform: 'image', sourceUrl: 'browser://image-upscaler', idempotencyKey: operationKey };
  const gate = await requireCredits({ cost: JOB_COST.imageTool, request: req, operation });
  if (!gate.ok) return gate.response;
  const userLimited = await checkImageUserLimit(gate.userId, `image-upscaler:${action}`, { limit: action === 'authorize' ? 12 : 30, windowSeconds: 60 });
  if (userLimited) return userLimited;

  if (action === 'authorize') {
    await gate.begin(operation);
    return NextResponse.json({ ok: true, authorized: true });
  }
  if (action === 'failed') {
    await gate.fail({ ...operation, failureReason: 'Browser-side image upscaling failed' });
    return NextResponse.json({ ok: true });
  }
  if (!(await gate.spend({ ...operation, description: `Image Upscaler ${body.result!.scale}× (${body.result!.width}×${body.result!.height} PNG)` }))) {
    return NextResponse.json({ error: 'Credit balance changed. Please retry.' }, { status: 402 });
  }

  return NextResponse.json({ ok: true });
}
