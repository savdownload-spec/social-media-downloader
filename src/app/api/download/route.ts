import { NextResponse } from 'next/server';
import { z } from 'zod';
import { toolsBySlug } from '@/config/tools';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { cacheJson } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { sha256 } from '@/lib/utils';
import { resolveWithYtdlp } from '@/lib/ytdlp';
import { resolveWithGalleryDl } from '@/lib/gallerydl';
import type { DownloadResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  url:  z.string().min(1).max(2048),
  tool: z.string().min(1).max(100),
});

/**
 * Tools that use gallery-dl (image galleries, carousels, profile pics).
 * All others default to yt-dlp.
 */
const GALLERY_DL_TOOLS = new Set([
  'instagram-photo-downloader',
  'instagram-story-downloader',
  'instagram-profile-picture-downloader',
  'pinterest-image-downloader',
  'tiktok-photo-downloader',
]);

/**
 * Tools where we call the thumbnail resolver directly (no binary needed).
 */
const THUMBNAIL_TOOLS = new Set([
  'youtube-thumbnail-downloader',
]);

/**
 * Tools whose platform has no predictable CDN thumbnail URL pattern
 * (unlike YouTube's img.youtube.com) — resolved via yt-dlp metadata instead.
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
  /* ── 1. Rate limit ── */
  const ip = getClientId(req);
  const rl = await ratelimit(`dl:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json<DownloadResult>(
      { ok: false, error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'x-ratelimit-remaining': String(rl.remaining) } },
    );
  }

  /* ── 2. Validate body ── */
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json<DownloadResult>(
      { ok: false, error: 'Invalid request.' },
      { status: 400 },
    );
  }

  /* ── 3. Look up tool ── */
  const tool = toolsBySlug.get(body.tool);
  if (!tool) {
    return NextResponse.json<DownloadResult>(
      { ok: false, error: 'Unknown tool.' },
      { status: 404 },
    );
  }
  if (!tool.urlPattern.test(body.url)) {
    return NextResponse.json<DownloadResult>(
      { ok: false, error: `That doesn't look like a valid ${tool.platform} link.` },
      { status: 400 },
    );
  }

  /* ── 4. Cache → resolve ── */
  const cacheKey = `dl:v2:${tool.slug}:${await sha256(body.url)}`;

  const result = await cacheJson<DownloadResult>(cacheKey, 60 * 30, async () =>
    dispatch(tool.slug, body.url),
  );

  /* ── 5. Log download (non-blocking) ── */
  if (result.ok) {
    void prisma.download
      .create({
        data: {
          platform:  tool.platform,
          tool:      tool.slug,
          sourceUrl: body.url,
          status:    'success',
          ipHash:    await sha256(ip),
          userAgent: req.headers.get('user-agent') ?? null,
        },
      })
      .catch(() => { /* ignore DB errors */ });
  }

  return NextResponse.json(result, {
    headers: {
      'x-ratelimit-limit':      String(rl.limit),
      'x-ratelimit-remaining':  String(rl.remaining),
    },
  });
}

/**
 * Route a download request to the correct service layer.
 */
async function dispatch(toolSlug: string, url: string): Promise<DownloadResult> {
  if (GALLERY_DL_TOOLS.has(toolSlug)) {
    return resolveWithGalleryDl(url, toolSlug);
  }

  if (THUMBNAIL_TOOLS.has(toolSlug)) {
    return resolveWithYtdlp(url, toolSlug, { thumbnailOnly: true });
  }

  if (METADATA_THUMBNAIL_TOOLS.has(toolSlug)) {
    return resolveWithYtdlp(url, toolSlug, { thumbnailViaMetadata: true });
  }

  if (AUDIO_ONLY_TOOLS.has(toolSlug)) {
    return resolveWithYtdlp(url, toolSlug, { audioOnly: true });
  }

  if (PLAYLIST_TOOLS.has(toolSlug)) {
    return resolveWithYtdlp(url, toolSlug, { playlist: true });
  }

  // Default: yt-dlp with full video+audio formats
  return resolveWithYtdlp(url, toolSlug);
}
