/**
 * GET /api/download/merge?url=<source page url>&height=<max height>&filename=<name>
 *
 * Most platforms (YouTube especially) only serve resolutions above ~360p as
 * separate video-only and audio-only DASH streams, there is no single CDN
 * URL that contains both. Handing back a raw video-only stream URL (as a
 * plain proxy would) produces a "video" with no sound.
 *
 * This route has yt-dlp download+merge both tracks server-side (via FFmpeg)
 * into one real MP4, then serves that file, the same "download to a temp
 * file, then serve it" pattern used for TikTok, generalized for any
 * yt-dlp-supported platform.
 *
 * Architecture: API Route → yt-dlp (+ FFmpeg merge) → temp file → response
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
import { requireCredits, costForHeight, requestIdempotencyKey } from '@/lib/credits';
import { getYtdlpBin, getFfmpegBin } from '@/lib/binaryPaths';
import { isSupportedPlatformUrl } from '@/lib/security/remote-url';
import { requireToolAvailable } from '@/lib/toolStatus';
import { normalizeYouTubeVideoUrl } from '@/lib/youtube-url';
import { DOWNLOAD_NOT_PERMITTED, getToolPolicy } from '@/lib/downloaderPolicy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// This does a real download + FFmpeg merge, which can take well past
// Vercel's default 10s, extend as far as the plan allows.
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

const YTDLP_BIN        = getYtdlpBin();
const FFMPEG_BIN        = getFfmpegBin();
const DOWNLOAD_TIMEOUT   = parseInt(process.env.YTDLP_TIMEOUT_MS || '45000', 10) * 2; // real download, not metadata

export async function GET(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`dlmerge:${ip}`, {
    limit: 10,
    windowSeconds: 60,
    fallbackToMemory: true,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.', code: 'PROVIDER_RATE_LIMITED' },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(req.url);
  const pageUrl   = searchParams.get('url');
  const heightRaw = searchParams.get('height');
  const filename  = (searchParams.get('filename') || 'video').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 200);
  const operationId = searchParams.get('operationId') ?? undefined;
  const tool = searchParams.get('tool') || 'media-downloader';
  const platform = searchParams.get('platform') || 'download';

  // Compliance gate: reject tools that are not permitted to deliver media,
  // before touching credits or running yt-dlp. The tool id is client-supplied,
  // so unknown ids fall back to the default deny policy.
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

  if (!pageUrl || !isSupportedPlatformUrl(pageUrl)) {
    return NextResponse.json({ error: 'Invalid or missing source URL.', code: 'INVALID_URL' }, { status: 400 });
  }
  if (tool === 'youtube-video-downloader' && !normalizeYouTubeVideoUrl(pageUrl).ok) {
    return NextResponse.json({ error: 'Invalid YouTube video URL.', code: 'INVALID_URL' }, { status: 400 });
  }
  const height = heightRaw ? parseInt(heightRaw, 10) : NaN;
  if (!Number.isInteger(height) || height < 1 || height > 4320) {
    return NextResponse.json({ error: 'Invalid quality.', code: 'FORMAT_UNAVAILABLE' }, { status: 400 });
  }

  /* ── Tool status gate — reject before credits are charged ── */
  const statusGate = await requireToolAvailable(tool);
  if (!statusGate.ok) return statusGate.response;

  // Charged after the merge succeeds, so a failed render costs nothing. The
  // cost depends on the resolution actually requested — 4K counts double.
  const cost = costForHeight(height);
  const operation = {
    tool, platform, operationId, sourceUrl: pageUrl,
    idempotencyKey: requestIdempotencyKey(req),
  };
  const gate = await requireCredits({ cost, request: req, operation });
  if (!gate.ok) return gate.response;
  const activeOperationId = await gate.begin(operation);
  if (!activeOperationId) return NextResponse.json({ error: 'Unable to start this download. Please try again.' }, { status: 500 });
  const activeOperation = { ...operation, operationId: activeOperationId };

  const dir     = await mkdtemp(path.join(tmpdir(), 'savdown-merge-'));
  const outPath = path.join(dir, `v-${randomUUID()}.mp4`);
  let streaming = false;

  try {
    try {
      // yt-dlp's --ffmpeg-location, when given a directory, only looks for a
      // binary literally named "ffmpeg"/"ffmpeg.exe", our FFMPEG_BIN is a
      // versioned filename (e.g. from the imageio_ffmpeg package), so it
      // must be passed as the exact binary path, not its containing folder.
      const ytArgs = [
        '--no-playlist', '--no-warnings',
        '--socket-timeout', '25', '--retries', '2',
        '--force-ipv4',
        '--ffmpeg-location', FFMPEG_BIN,
        '-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`,
        '--merge-output-format', 'mp4',
        '-o', outPath,
        '--', pageUrl,
      ];
      if (/(?:^|\.)youtube\.com$|^youtu\.be$/.test(new URL(pageUrl).hostname)) {
        const urlIndex = ytArgs.indexOf('--');
        ytArgs.splice(urlIndex, 0,
          '--js-runtimes', 'node',
          '--extractor-args', 'youtube:player_client=default,tv,web_safari',
        );
      }
      await execFileAsync(YTDLP_BIN, ytArgs, { timeout: DOWNLOAD_TIMEOUT, maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
      const execErr = err as (Error & { stderr?: string }) | undefined;
      const msg = execErr?.stderr || (err instanceof Error ? err.message : String(err));
      const friendly = msg.includes('Sign in to confirm') || msg.includes('not a bot')
        ? 'The platform is temporarily rate-limiting automated requests. Please try again in a few minutes.'
        : msg.includes('Requested format is not available')
        ? 'This quality is not available for this video.'
        : msg.includes('Private video') || msg.includes('private')
        ? 'This video is private and cannot be downloaded.'
        : 'Could not download this video.';
      await gate.fail({ ...activeOperation, failureCode: 'processing_failed', failureReason: friendly });
      return NextResponse.json({ error: friendly, code: 'PROCESSING_FAILED' }, { status: 502 });
    }

    const outputSize = (await stat(outPath)).size;
    const maxResponseBytes = parseInt(process.env.MAX_DOWNLOAD_BYTES || String(450 * 1024 * 1024), 10);
    if (!outputSize) {
      await gate.fail({ ...activeOperation, failureCode: 'empty_output', failureReason: 'Empty output file' });
      return NextResponse.json({ error: 'The platform returned an empty file.', code: 'PROCESSING_FAILED' }, { status: 502 });
    }
    if (outputSize > maxResponseBytes) {
      const reason = 'The generated file exceeds the configured download size limit.';
      await gate.fail({ ...activeOperation, failureCode: 'output_too_large', failureReason: reason });
      return NextResponse.json({ error: reason, code: 'FILE_TOO_LARGE' }, { status: 413 });
    }

    if (!(await gate.spend({
      ...activeOperation,
      description: `${height}p download`,
    }))) {
      await gate.fail({ ...activeOperation, failureCode: 'credit_commit_failed', failureReason: 'Credit balance changed before completion' });
      return NextResponse.json(
        { error: 'Your balance changed before this could be charged. Please retry.' },
        { status: 402 },
      );
    }

    // Streaming keeps large downloads out of memory and avoids Vercel's
    // 4.5 MB buffered-response limit. The temp directory is removed once the
    // stream closes.
    const fileStream = createReadStream(outPath);
    streaming = true;
    fileStream.on('close', () => { void rm(dir, { recursive: true, force: true }).catch(() => {}); });
    fileStream.on('error', () => { void rm(dir, { recursive: true, force: true }).catch(() => {}); });

    return new NextResponse(Readable.toWeb(fileStream) as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        'Content-Type':        'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(outputSize),
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unexpected delivery failure.';
    await gate.fail({ ...activeOperation, failureCode: 'delivery_failed', failureReason: reason }).catch(() => {});
    return NextResponse.json({ error: 'The file could not be delivered. No credits were charged.', code: 'DELIVERY_FAILED' }, { status: 500 });
  } finally {
    if (!streaming) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
