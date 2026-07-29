import { NextResponse } from 'next/server';
import { z } from 'zod';
import { toolsBySlug } from '@/config/tools';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { cacheJson } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { sha256 } from '@/lib/utils';
import type { DownloadResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  url: z.string().min(1).max(2048),
  tool: z.string().min(1).max(100),
});

/**
 * POST /api/download
 * Body: { url, tool }
 *
 * Flow:
 *   1. Validate + rate-limit by IP.
 *   2. Look up the tool by slug and verify URL pattern.
 *   3. Cache-fetch metadata from the downloader service (30-min TTL).
 *   4. Log the download event (non-blocking).
 *
 * The actual media resolution is delegated to DOWNLOADER_API_URL.
 * If unset, we return a structured stub so the UI still works in dev.
 */
export async function POST(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`dl:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json<DownloadResult>(
      { ok: false, error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'x-ratelimit-remaining': String(rl.remaining) } },
    );
  }

  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json<DownloadResult>({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const tool = toolsBySlug.get(body.tool);
  if (!tool) {
    return NextResponse.json<DownloadResult>({ ok: false, error: 'Unknown tool.' }, { status: 404 });
  }
  if (!tool.urlPattern.test(body.url)) {
    return NextResponse.json<DownloadResult>(
      { ok: false, error: `That doesn't look like a valid ${tool.platform} link.` },
      { status: 400 },
    );
  }

  const cacheKey = `dl:${tool.slug}:${await sha256(body.url)}`;
  const result = await cacheJson<DownloadResult>(cacheKey, 60 * 30, async () =>
    resolveDownload(tool.slug, body.url),
  );

  // Fire-and-forget logging
  if (result.ok) {
    void prisma.download
      .create({
        data: {
          platform: tool.platform,
          tool: tool.slug,
          sourceUrl: body.url,
          status: 'success',
          ipHash: await sha256(ip),
          userAgent: req.headers.get('user-agent') || null,
        },
      })
      .catch(() => { /* ignore */ });
  }

  return NextResponse.json(result, {
    headers: {
      'x-ratelimit-limit': String(rl.limit),
      'x-ratelimit-remaining': String(rl.remaining),
    },
  });
}

/**
 * Delegates to your downloader micro-service.
 *
 * Set DOWNLOADER_API_URL to your own yt-dlp/gallery-dl service or a RapidAPI
 * endpoint. The expected response shape matches DownloadResult.
 *
 * If DOWNLOADER_API_URL is not set, we return a demo payload so the front-end
 * remains fully clickable in local dev.
 */
async function resolveDownload(toolSlug: string, url: string): Promise<DownloadResult> {
  const apiUrl = process.env.DOWNLOADER_API_URL;

  if (!apiUrl) {
    // Demo response — replace by integrating a real downloader service.
    return {
      ok: true,
      title: 'Demo mode — set DOWNLOADER_API_URL to enable real downloads',
      thumbnail: 'https://picsum.photos/seed/savdown/640/360',
      author: 'SavDown',
      platform: toolSlug,
      formats: [
        { label: 'MP4 1080p', quality: '1080p', extension: 'mp4', size: '24.6 MB', url: '#demo', hasAudio: true, hasVideo: true },
        { label: 'MP4 720p', quality: '720p', extension: 'mp4', size: '11.2 MB', url: '#demo', hasAudio: true, hasVideo: true },
        { label: 'MP3 audio', quality: '192kbps', extension: 'mp3', size: '3.1 MB', url: '#demo', hasAudio: true },
      ],
    };
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.DOWNLOADER_API_KEY
          ? { authorization: `Bearer ${process.env.DOWNLOADER_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({ url, tool: toolSlug }),
      // 25s ceiling so the UI doesn't hang forever
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      return { ok: false, error: `Downloader service responded ${res.status}.` };
    }
    return (await res.json()) as DownloadResult;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? `Downloader failed: ${e.message}` : 'Downloader failed.',
    };
  }
}
