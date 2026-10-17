/**
 * GET /api/tools/video/url-to-gif?url=<source>&filename=<name>
 *
 * On-demand MP4→GIF conversion for a resolved CDN stream URL. Used by
 * X GIF Downloader's "real GIF" format option: yt-dlp resolves the source
 * MP4 stream URL, and this route lazily converts it to an actual animated
 * GIF only when the user clicks that specific download option.
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST, recordRejectedOperation, requestIdempotencyKey } from '@/lib/credits';
import { urlToGif } from '@/lib/videoService';
import { isTrustedXMediaUrl } from '@/lib/security/remote-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sourceUrl = searchParams.get('url');
  const filename = (searchParams.get('filename') || 'video').replace(/[/\\?%*:|"<>]/g, '-');
  const existingOperationId = searchParams.get('operationId') ?? undefined;
  // This endpoint is emitted only by the X GIF resolver. Direct MP4 uploads
  // use POST /api/tools/video and retain their gif-maker/mp4-to-gif slug.
  const tool = 'x-gif-downloader';
  const requestKey = requestIdempotencyKey(req);
  const gateOperation = {
    tool,
    platform: 'x',
    sourceUrl: `tool://${tool}`,
    idempotencyKey: requestKey,
  };
  const ip = getClientId(req);
  const rl = await ratelimit(`vidurl:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    await recordRejectedOperation(req, gateOperation, 'rate_limited', 'Rate limit exceeded');
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  // Credits are spent only once the job below succeeds.
  const gate = await requireCredits({ cost: JOB_COST.videoTool, request: req, operation: gateOperation });
  if (!gate.ok) return gate.response;

  if (!sourceUrl || !isTrustedXMediaUrl(sourceUrl)) {
    await gate.fail({ ...gateOperation, failureCode: 'validation_failed', failureReason: 'Invalid or missing source URL' });
    return NextResponse.json({ error: 'Invalid or missing source URL.' }, { status: 400 });
  }
  const operation = {
    tool, platform: 'x', operationId: existingOperationId, sourceUrl,
    idempotencyKey: requestKey,
  };

  const activeOperationId = await gate.begin(operation);
  if (!activeOperationId) {
    return NextResponse.json({ error: 'Unable to start processing. Please try again.' }, { status: 500 });
  }
  const activeOperation = { ...operation, operationId: activeOperationId };
  const result = await urlToGif(sourceUrl, { fps: 12, width: 480 });
  if (!result.ok) {
    await gate.fail({ ...activeOperation, failureCode: 'processing_failed', failureReason: result.error });
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const base = filename.replace(/\.[^.]+$/, '');
  const buffer = Buffer.from(result.buffer);
  if (!(await gate.spend({
    ...activeOperation, description: 'URL to GIF',
  }))) {
    await gate.fail({ ...activeOperation, failureCode: 'credit_commit_failed', failureReason: 'Credit balance changed before completion' });
    return NextResponse.json(
      { error: 'Your balance changed before this could be charged. Please retry.' },
      { status: 402 },
    );
  }
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':        result.mimeType,
      'Content-Disposition': `attachment; filename="${base}.gif"`,
      'Content-Length':      String(buffer.length),
      'Cache-Control':       'no-store',
    },
  });
}
