/**
 * GET /api/proxy?url=...&filename=...
 *
 * Proxies a media file from an external CDN through our server so:
 *   - CORS headers are set correctly for browser downloads
 *   - Content-Disposition forces a file download with the right filename
 *   - The original CDN URL is never exposed to the client
 *
 * Security:
 *   - Only streams from allowed media hostnames (allowlist)
 *   - Rate-limited per IP (10 req/min for large files)
 *   - Max response size: 500 MB
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST, requestIdempotencyKey } from '@/lib/credits';

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

function isAllowedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

export async function GET(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`proxy:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    return new NextResponse('Rate limit exceeded.', { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');
  const filename  = searchParams.get('filename') || 'download';
  // Some CDNs (e.g. TikTok) bind signed stream URLs to the exact Referer and
  // session cookies present at extraction time and 403 anything else. When
  // the resolver captured them, replay them here instead of generic headers.
  const referer   = searchParams.get('ref');
  const cookie    = searchParams.get('cookie');
  const operationId = searchParams.get('operationId') ?? undefined;
  const tool = searchParams.get('tool') || 'media-downloader';
  const platform = searchParams.get('platform') || 'download';

  if (!targetUrl) {
    return new NextResponse('Missing url parameter.', { status: 400 });
  }

  if (!isAllowedHost(targetUrl)) {
    return new NextResponse('Host not allowed.', { status: 403 });
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
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': referer
          ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          : 'Mozilla/5.0 (compatible; SavDown/1.0)',
        'Referer': referer || new URL(targetUrl).origin,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok) {
      await gate.fail({ ...activeOperation, failureCode: 'upstream_http_error', failureReason: `Upstream responded ${upstream.status}` });
      return new NextResponse(`Upstream responded ${upstream.status}.`, { status: 502 });
    }

    const contentLength = parseInt(upstream.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_BYTES) {
      await gate.fail({ ...activeOperation, failureCode: 'file_too_large', failureReason: 'File too large to proxy' });
      return new NextResponse('File too large to proxy.', { status: 413 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    // Sanitise filename
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

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control':       'public, max-age=3600',
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
