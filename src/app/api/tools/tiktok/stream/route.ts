/**
 * GET /api/tools/tiktok/stream?url=<tiktok page url>&height=<max height>&filename=<name>&audio=1
 *
 * TikTok's CDN binds signed stream URLs to the same impersonated session that
 * resolved them, so a later fetch of a raw CDN URL is rejected. This route
 * re-runs yt-dlp, downloads the bytes itself, and streams the temp file to
 * the browser. `audio=1` additionally extracts a real 192 kbps MP3.
 *
 * Streamed responses are not subject to Vercel's 4.5 MB buffered-body limit.
 *
 * Architecture: API Route → yt-dlp (temp file) [→ FFmpeg] → streamed response
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { mkdtemp, rm, stat } from 'fs/promises';
import { Readable } from 'stream';
import { tmpdir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST, requestIdempotencyKey } from '@/lib/credits';
import { isTiktokHost } from '@/lib/ytdlp';
import { getYtdlpBin, getFfmpegBin } from '@/lib/binaryPaths';
import { isSupportedPlatformUrl } from '@/lib/security/remote-url';
import { DOWNLOAD_NOT_PERMITTED, getToolPolicy } from '@/lib/downloaderPolicy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

const YTDLP_BIN        = getYtdlpBin();
const FFMPEG_BIN       = getFfmpegBin();
const DOWNLOAD_TIMEOUT = Math.min(parseInt(process.env.YTDLP_TIMEOUT_MS || '45000', 10) * 2, 240_000);

export async function GET(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`ttstream:${ip}`, { limit: 10, windowSeconds: 60, fallbackToMemory: true });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.', code: 'PROVIDER_RATE_LIMITED' },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(req.url);
  const pageUrl      = searchParams.get('url');
  const heightRaw    = searchParams.get('height');
  const extractAudio = searchParams.get('audio') === '1';
  const operationId  = searchParams.get('operationId') ?? undefined;
  const tool = searchParams.get('tool') || (extractAudio ? 'tiktok-to-mp3' : 'tiktok-video-downloader');
  const filename = (searchParams.get('filename') || 'tiktok-download').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 200);

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

  if (!pageUrl || !isSupportedPlatformUrl(pageUrl) || !isTiktokHost(pageUrl)) {
    return NextResponse.json({ error: 'Invalid or unsupported URL.', code: 'INVALID_URL' }, { status: 400 });
  }

  const height = heightRaw ? parseInt(heightRaw, 10) : 4320;
  if (!Number.isInteger(height) || height < 144 || height > 4320) {
    return NextResponse.json({ error: 'Invalid quality.', code: 'FORMAT_UNAVAILABLE' }, { status: 400 });
  }

  const operation = {
    tool, platform: 'tiktok', operationId, sourceUrl: pageUrl,
    idempotencyKey: requestIdempotencyKey(req),
  };
  const gate = await requireCredits({ cost: JOB_COST.proxyDownload, request: req, operation });
  if (!gate.ok) return gate.response;
  const activeOperationId = await gate.begin(operation);
  if (!activeOperationId) {
    return NextResponse.json({ error: 'Unable to start this download. Please try again.' }, { status: 500 });
  }
  const activeOperation = { ...operation, operationId: activeOperationId };

  const dir = await mkdtemp(path.join(tmpdir(), 'savdown-tiktok-'));
  const videoPath = path.join(dir, `v-${randomUUID()}.mp4`);
  const mp3Path   = path.join(dir, `a-${randomUUID()}.mp3`);
  let streaming = false;

  try {
    const selector = extractAudio ? 'best' : `best[height<=${height}]/best`;
    try {
      await execFileAsync(YTDLP_BIN, [
        '--no-playlist', '--no-warnings',
        '--socket-timeout', '25', '--retries', '2',
        '--force-ipv4',
        '--impersonate', 'chrome',
        '-f', selector,
        '-o', videoPath,
        '--', pageUrl,
      ], { timeout: DOWNLOAD_TIMEOUT, maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = msg.includes('Requested format is not available')
        ? 'This quality is not available for this video.'
        : msg.includes('Unable to extract') || msg.includes('rehydration')
        ? 'TikTok temporarily blocked this request. Please try again in a moment.'
        : 'Could not download this video.';
      await gate.fail({ ...activeOperation, failureCode: 'processing_failed', failureReason: friendly });
      return NextResponse.json({ error: friendly, code: 'PROCESSING_FAILED' }, { status: 502 });
    }

    let outputPath = videoPath;
    let contentType = 'video/mp4';

    if (extractAudio) {
      try {
        await execFileAsync(FFMPEG_BIN, [
          '-y', '-i', videoPath,
          '-vn', '-c:a', 'libmp3lame', '-b:a', '192k',
          mp3Path,
        ], { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
      } catch {
        await gate.fail({ ...activeOperation, failureCode: 'processing_failed', failureReason: 'Audio extraction failed' });
        return NextResponse.json({ error: 'Could not extract audio from this video.', code: 'PROCESSING_FAILED' }, { status: 502 });
      }
      outputPath = mp3Path;
      contentType = 'audio/mpeg';
    }

    const { size } = await stat(outputPath);
    if (!size) {
      await gate.fail({ ...activeOperation, failureCode: 'empty_output', failureReason: 'Empty output file' });
      return NextResponse.json({ error: 'The platform returned an empty file.', code: 'PROCESSING_FAILED' }, { status: 502 });
    }

    if (!(await gate.spend({
      ...activeOperation,
      description: extractAudio ? 'TikTok audio download' : 'TikTok video download',
    }))) {
      await gate.fail({ ...activeOperation, failureCode: 'credit_commit_failed', failureReason: 'Credit balance changed before completion' });
      return NextResponse.json(
        { error: 'Your balance changed before this could be charged. Please retry.' },
        { status: 402 },
      );
    }

    const fileStream = createReadStream(outputPath);
    streaming = true;
    fileStream.on('close', () => { void rm(dir, { recursive: true, force: true }).catch(() => {}); });
    fileStream.on('error', () => { void rm(dir, { recursive: true, force: true }).catch(() => {}); });

    return new NextResponse(Readable.toWeb(fileStream) as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(size),
        'Cache-Control':       'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'The file could not be delivered. No credits were charged.', code: 'DELIVERY_FAILED' }, { status: 500 });
  } finally {
    if (!streaming) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
