import { NextResponse } from 'next/server';
import { z } from 'zod';
import { toolsBySlug } from '@/config/tools';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { recordToolOperation, requestIdempotencyKey, requireCredits } from '@/lib/credits';
import { cacheJson } from '@/lib/redis';
import { sha256 } from '@/lib/utils';
import { resolveWithYtdlp } from '@/lib/ytdlp';
import { resolveWithGalleryDl } from '@/lib/gallerydl';
import { resolveInstagramProfilePicture } from '@/lib/instagram';
import type { DownloadResult } from '@/types';
import { isSupportedPlatformUrl } from '@/lib/security/remote-url';
import { requireToolAvailable } from '@/lib/toolStatus';
import { normalizeYouTubeVideoUrl } from '@/lib/youtube-url';
import { DOWNLOAD_NOT_PERMITTED, getToolPolicy } from '@/lib/downloaderPolicy';
import { recordToolResult } from '@/lib/healthTracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  url:  z.string().min(1).max(2048),
  tool: z.string().min(1).max(100),
});

/**
 * Tools that use gallery-dl (image galleries, carousels, profile pics).
 * All others default to yt-dlp.
 *
 * NOTE: pinterest-image-downloader was moved to yt-dlp — yt-dlp's Pinterest
 * extractor handles single image pins without needing gallery-dl.
 */
const GALLERY_DL_TOOLS = new Set([
  'instagram-photo-downloader',
  'instagram-story-downloader',
]);

/**
 * Tools where we call the thumbnail resolver directly (no binary needed).
 */
const THUMBNAIL_TOOLS = new Set([
  'youtube-thumbnail-downloader',
]);

/**
 * Tools whose platform has no predictable CDN thumbnail URL pattern
 * (unlike YouTube's img.youtube.com), resolved via yt-dlp metadata instead.
 */
const METADATA_THUMBNAIL_TOOLS = new Set([
  'tiktok-thumbnail-downloader',
]);

/**
 * Tools that want audio-only extraction from yt-dlp.
 */
const AUDIO_ONLY_TOOLS = new Set([
  'youtube-to-mp3',
  'tiktok-to-mp3',
]);

/**
 * Tools that want playlist mode.
 */
const PLAYLIST_TOOLS = new Set([
  'youtube-playlist-downloader',
]);

export async function POST(req: Request) {
  const startTime = Date.now(); // Track response time for health monitoring
  let toolSlug = '';

  try {
    /* ── 1. Rate limit ── */
    const ip = getClientId(req);
    const rl = await ratelimit(`dl:${ip}`, {
      limit: 20,
      windowSeconds: 60,
      fallbackToMemory: true,
    });
    if (!rl.success) {
      return NextResponse.json<DownloadResult>(
        {
          ok: false,
          error: 'Too many requests. Please slow down.',
          code: 'PROVIDER_RATE_LIMITED',
        },
        { status: 429, headers: { 'x-ratelimit-remaining': String(rl.remaining) } },
      );
    }

    /* ── 2. Require an account (free: this only reads metadata) ──
       The credit is spent later, when the file is actually delivered by
       /api/proxy or /api/download/merge, so looking up formats costs nothing. */
    /* ── 3. Validate body ── */
    let body: z.infer<typeof BodySchema>;
    try {
      body = BodySchema.parse(await req.json());
      toolSlug = body.tool; // Store for health tracking
    } catch {
      return NextResponse.json<DownloadResult>(
        { ok: false, error: 'Invalid request.', code: 'INVALID_REQUEST' },
        { status: 400 },
      );
    }

    /* ── 4. Look up tool ── */
  const tool = toolsBySlug.get(body.tool);
  if (!tool) {
    return NextResponse.json<DownloadResult>(
      { ok: false, error: 'Unknown tool.', code: 'UNSUPPORTED_PLATFORM' },
      { status: 404 },
    );
  }

  /* ── 4a. Tool status gate — reject before any processing for unavailable tools ── */
  const statusGate = await requireToolAvailable(body.tool);
  if (!statusGate.ok) return statusGate.response;

  /* ── 4b. Compliance gate — some tools are preview-only by policy ── */
  const policy = getToolPolicy(tool.slug);
  if (!policy.metadataPermitted) {
    return NextResponse.json<DownloadResult>(
      {
        ok: false,
        error: policy.restriction?.message ?? 'This tool is not available.',
        code: policy.restriction?.code ?? DOWNLOAD_NOT_PERMITTED,
        restriction: policy.restriction,
      },
      { status: 403 },
    );
  }

  if (!tool.urlPattern.test(body.url)) {
    return NextResponse.json<DownloadResult>(
      { ok: false, error: `That doesn't look like a valid ${tool.platform} link.`, code: 'INVALID_URL' },
      { status: 400 },
    );
  }
  if (!isSupportedPlatformUrl(body.url)) {
    return NextResponse.json<DownloadResult>(
      { ok: false, error: 'Only HTTPS links from supported platforms are allowed.', code: 'UNSUPPORTED_PLATFORM' },
      { status: 400 },
    );
  }

  let sourceUrl = body.url;
  if (tool.slug === 'youtube-video-downloader') {
    const normalized = normalizeYouTubeVideoUrl(body.url);
    if (!normalized.ok) {
      return NextResponse.json<DownloadResult>({ ok: false, error: normalized.error }, { status: 400 });
    }
    sourceUrl = normalized.url;
  }

  const gate = await requireCredits({ cost: 0 });
  if (!gate.ok) return gate.response;

  /* ── 5. Cache → resolve ── */
  const cacheKey = `dl:v4:${tool.slug}:${await sha256(sourceUrl)}`;

  const result = await cacheJson<DownloadResult>(
    cacheKey,
    60 * 30,
    async () => dispatch(tool.slug, sourceUrl, policy),
    (value) => value.ok,
  );

  /* ── 6. Persist one canonical metadata/tool operation ── */
  // Only same-origin delivery routes complete an operation later. A
  // preview-only result, or a direct CDN format, is already complete;
  // marking it pending would leave the operation stuck forever.
  const hasDeferredDelivery = result.ok && result.formats.some((format) => format.url.startsWith('/'));
  const operationId = await recordToolOperation(gate.userId, {
    platform: tool.platform,
    tool: tool.slug,
    sourceUrl,
    status: result.ok ? (hasDeferredDelivery ? 'pending' : 'success') : 'failed',
    failureReason: result.ok ? null : result.error,
    idempotencyKey: requestIdempotencyKey(req),
    ipHash: await sha256(ip),
    userAgent: req.headers.get('user-agent'),
  });
  const scoped = result.ok
    ? { ...result, downloadPermitted: policy.downloadPermitted, restriction: policy.restriction }
    : result;
  const response = scoped.ok && operationId ? withOperationContext(scoped, operationId, tool.slug, tool.platform) : scoped;

  // Record health metrics
  const responseMs = Date.now() - startTime;
  await recordToolResult(
    tool.slug,
    result.ok,
    responseMs,
    result.ok ? undefined : result.error,
    result.ok ? undefined : result.code
  );

  return NextResponse.json(response, {
    headers: {
      'x-ratelimit-limit':      String(rl.limit),
      'x-ratelimit-remaining':  String(rl.remaining),
    },
  });
  } catch (error) {
    // Record health metrics for unexpected errors
    if (toolSlug) {
      const responseMs = Date.now() - startTime;
      await recordToolResult(
        toolSlug,
        false,
        responseMs,
        error instanceof Error ? error.message : 'Internal server error',
        'INTERNAL_ERROR'
      );
    }
    throw error; // Re-throw to let Next.js handle it
  }
}

function withOperationContext(result: Extract<DownloadResult, { ok: true }>, operationId: string, tool: string, platform: string): DownloadResult {
  return {
    ...result,
    formats: result.formats.map((format) => {
      try {
        const parsed = new URL(format.url, 'https://savdown.local');
        if (parsed.origin !== 'https://savdown.local') return format;
        parsed.searchParams.set('operationId', operationId);
        parsed.searchParams.set('tool', tool);
        parsed.searchParams.set('platform', platform);
        return { ...format, url: `${parsed.pathname}${parsed.search}${parsed.hash}` };
      } catch {
        return format;
      }
    }),
  };
}

/**
 * Route a download request to the correct service layer.
 */
async function dispatch(
  toolSlug: string,
  url: string,
  policy: ReturnType<typeof getToolPolicy>,
): Promise<DownloadResult> {
  // Preview-only tools must not run format probing or gallery extraction.
  // Metadata is fetched, no downloadable URLs are produced.
  const metadataOnly = !policy.downloadPermitted;

  if (GALLERY_DL_TOOLS.has(toolSlug)) {
    return resolveWithGalleryDl(url, toolSlug);
  }

  if (toolSlug === 'instagram-profile-picture-downloader') {
    return resolveInstagramProfilePicture(url);
  }

  if (THUMBNAIL_TOOLS.has(toolSlug)) {
    return resolveWithYtdlp(url, toolSlug, { thumbnailOnly: true });
  }

  if (METADATA_THUMBNAIL_TOOLS.has(toolSlug)) {
    return resolveWithYtdlp(url, toolSlug, { thumbnailViaMetadata: true, metadataOnly });
  }

  if (AUDIO_ONLY_TOOLS.has(toolSlug)) {
    return resolveWithYtdlp(url, toolSlug, { audioOnly: true, metadataOnly });
  }

  if (PLAYLIST_TOOLS.has(toolSlug)) {
    return resolveWithYtdlp(url, toolSlug, { playlist: true, metadataOnly });
  }

  // Default: yt-dlp with full video+audio formats
  return resolveWithYtdlp(url, toolSlug, { metadataOnly });
}
