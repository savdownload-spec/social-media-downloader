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

  if (!targetUrl) {
    return new NextResponse('Missing url parameter.', { status: 400 });
  }

  if (!isAllowedHost(targetUrl)) {
    return new NextResponse('Host not allowed.', { status: 403 });
  }

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
      return new NextResponse(`Upstream responded ${upstream.status}.`, { status: 502 });
    }

    const contentLength = parseInt(upstream.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_BYTES) {
      return new NextResponse('File too large to proxy.', { status: 413 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    // Sanitise filename
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 200);

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
  } catch {
    return new NextResponse('Could not fetch this file. Please try again.', { status: 502 });
  }
}
