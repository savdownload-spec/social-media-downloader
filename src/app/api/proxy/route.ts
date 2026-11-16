/**
 * GET /api/proxy?url=...&filename=...
 *
 * Proxies an allowlisted media file through our server so:
 *   - CORS headers are set correctly for browser downloads
 *   - Content-Disposition forces a file download with the right filename
 *   - The original CDN URL is never exposed to the client
 *
 * Security:
 *   - Only streams from allowlisted media hostnames
 *   - Revalidates every redirect hop (no allowlist bypass via redirect)
 *   - Rejects hosts that resolve to private / link-local / metadata ranges
 *   - Enforces a byte cap even when upstream omits Content-Length
 *   - Delivery is gated by the downloader permission policy
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST, requestIdempotencyKey } from '@/lib/credits';
import { DOWNLOAD_NOT_PERMITTED, getToolPolicy } from '@/lib/downloaderPolicy';
import { assertPublicAllowedUrl } from '@/lib/security/outbound';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Domains we are willing to proxy. Add CDN endpoints as needed. */
const ALLOWED_HOSTS = [
  'googlevideo.com',       // YouTube
  'youtube.com',
  'ytimg.com',             // YouTube images/thumbnails
  'tiktokcdn.com',         // TikTok CDN
  'tiktokv.com',
  'tiktok.com',            // TikTok video streams (e.g. v19-webapp-prime.tiktok.com)
  'musical.ly',
  'cdninstagram.com',      // Instagram CDN
  'fbcdn.net',             // Facebook CDN
  'pinimg.com',            // Pinterest CDN
  'twimg.com',             // Twitter/X images
  'pbs.twimg.com',
  'video.twimg.com',
  'ggpht.com',
];

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_REDIRECTS = 3;

/** Caps a streamed body without buffering it. */
function limitStream(body: ReadableStream<Uint8Array>, maxBytes: number): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let received = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      received += value.byteLength;
      if (received > maxBytes) {
        controller.error(new Error('FILE_TOO_LARGE'));
        await reader.cancel().catch(() => {});
        return;
      }
      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export async function GET(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`proxy:${ip}`, { limit: 10, windowSeconds: 60, fallbackToMemory: true });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.', code: 'PROVIDER_RATE_LIMITED' },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');
  const filename  = searchParams.get('filename') || 'download';
  const operationId = searchParams.get('operationId') ?? undefined;
  const tool = searchParams.get('tool') || 'media-downloader';
  const platform = searchParams.get('platform') || 'download';

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter.', code: 'INVALID_URL' }, { status: 400 });
  }

  const policy = getToolPolicy(tool);
  if (!policy.downloadPermitted) {
    return NextResponse.json(
      {
        error: policy.restriction?.message ?? 'Download delivery is not available for this tool.',
        code: policy.restriction?.code ?? DOWNLOAD_NOT_PERMITTED,
      },
      { status: 403 },
    );
  }

  const operation = {
    tool, platform, operationId, sourceUrl: targetUrl,
    idempotencyKey: requestIdempotencyKey(req),
  };
  // This route hands over the actual file, so it is where the credit is spent.
  // Errors stay plain text to match the rest of this route's responses.
  const gate = await requireCredits({ cost: JOB_COST.proxyDownload, plainText: true, request: req, operation });
  if (!gate.ok) return gate.response;
  const activeOperationId = await gate.begin(operation);
  if (!activeOperationId) return new NextResponse('Unable to start this download. Please try again.', { status: 500 });
  const activeOperation = { ...operation, operationId: activeOperationId };

  try {
    let upstream: Response | null = null;
    let currentUrl = targetUrl;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const validated = await assertPublicAllowedUrl(currentUrl, ALLOWED_HOSTS);
      if (!validated) {
        await gate.fail({ ...activeOperation, failureCode: 'host_not_allowed', failureReason: 'Host not allowed' });
        return new NextResponse('Host not allowed.', { status: 403 });
      }

      const res = await fetch(validated, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SavDown/1.0)',
          'Referer': validated.origin,
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        await res.body?.cancel().catch(() => {});
        if (!location) break;
        currentUrl = new URL(location, validated).toString();
        continue;
      }

      upstream = res;
      break;
    }

    if (!upstream) {
      await gate.fail({ ...activeOperation, failureCode: 'redirect_failed', failureReason: 'Too many redirects or missing location' });
      return new NextResponse('Could not fetch this file. Please try again.', { status: 502 });
    }

    if (!upstream.ok) {
      await gate.fail({ ...activeOperation, failureCode: 'upstream_http_error', failureReason: `Upstream responded ${upstream.status}` });
      return new NextResponse(`Upstream responded ${upstream.status}.`, { status: 502 });
    }

    const contentLength = parseInt(upstream.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_BYTES) {
      await gate.fail({ ...activeOperation, failureCode: 'file_too_large', failureReason: 'File too large to proxy' });
      return new NextResponse('File too large to proxy.', { status: 413 });
    }

    if (!upstream.body) {
      await gate.fail({ ...activeOperation, failureCode: 'empty_upstream', failureReason: 'Upstream returned an empty body' });
      return new NextResponse('Could not fetch this file. Please try again.', { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 200);

    // Charged once the upstream has accepted and the body is on its way.
    if (!(await gate.spend({
      ...activeOperation,
      description: `Download — ${safeFilename}`,
    }))) {
      await gate.fail({ ...activeOperation, failureCode: 'credit_commit_failed', failureReason: 'Credit balance changed before completion' });
      return new NextResponse('Your balance changed before this could be charged. Please retry.', {
        status: 402,
      });
    }

    return new NextResponse(limitStream(upstream.body, MAX_BYTES), {
      status: 200,
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control':       'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        ...(upstream.headers.get('content-length')
          ? { 'Content-Length': upstream.headers.get('content-length')! }
          : {}),
      },
    });
  } catch (err) {
    await gate.fail({
      ...activeOperation,
      failureCode: err instanceof DOMException && err.name === 'TimeoutError' ? 'processing_timeout' : 'upstream_fetch_failed',
      failureReason: err instanceof DOMException && err.name === 'TimeoutError' ? 'Upstream request timed out' : 'Upstream fetch failed',
    });
    return new NextResponse('Could not fetch this file. Please try again.', { status: 502 });
  }
}
