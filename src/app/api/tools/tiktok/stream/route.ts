/**
 * GET /api/tools/tiktok/stream?url=<tiktok page url>&selector=<format selector>&filename=<name>&audio=1
 *
 * TikTok media delivery is disabled by the compliance policy: no TikTok tool
 * is permitted to hand back a media file. The route is retained for a future
 * authorized flow and rejects every request with DOWNLOAD_NOT_PERMITTED
 * before authentication or extraction.
 *
 * Architecture (when re-enabled): API Route → yt-dlp binary (temp file)
 * [→ FFmpeg] → streamed response.
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST, requestIdempotencyKey } from '@/lib/credits';
import { isTiktokHost, KNOWN_SELECTORS } from '@/lib/ytdlp';
import { getYtdlpBin, getFfmpegBin } from '@/lib/binaryPaths';
import { isSupportedPlatformUrl } from '@/lib/security/remote-url';
import { DOWNLOAD_NOT_PERMITTED, getToolPolicy } from '@/lib/downloaderPolicy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

const YTDLP_BIN      = getYtdlpBin();
const FFMPEG_BIN      = getFfmpegBin();
const DOWNLOAD_TIMEOUT = parseInt(process.env.YTDLP_TIMEOUT_MS || '45000', 10) * 2; // real download, not metadata, allow more time

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
  const selector     = searchParams.get('selector');
  const extractAudio = searchParams.get('audio') === '1';
  const operationId = searchParams.get('operationId') ?? undefined;
  const tool = searchParams.get('tool') || (extractAudio ? 'tiktok-to-mp3' : 'tiktok-video-downloader');
  const filename      = (searchParams.get('filename') || 'tiktok-download').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 200);
  const operation = {
    tool, platform: 'tiktok', operationId, sourceUrl: pageUrl ?? `tool://${tool}`,
    idempotencyKey: requestIdempotencyKey(req),
  };

  // Compliance gate: no TikTok tool is delivery-permitted today. Reject before
  // authentication or downloading anything.
  const policy = getToolPolicy(tool);
  if (!policy.downloadPermitted || !pageUrl || !isTiktokHost(pageUrl)) {
    return NextResponse.json(
      {
        error: policy.restriction?.message ?? 'TikTok delivery is not available.',
        code: policy.restriction?.code ?? DOWNLOAD_NOT_PERMITTED,
      },
      { status: 403 },
    );
  }

  // Credits are spent only once the job below succeeds.
  const gate = await requireCredits({ cost: JOB_COST.proxyDownload, request: req, operation });
  if (!gate.ok) return gate.response;

  if (!isSupportedPlatformUrl(pageUrl)) {
    await gate.fail({ ...operation, failureCode: 'validation_failed', failureReason: 'Invalid or unsupported URL' });
    return NextResponse.json({ error: 'Invalid or unsupported URL.', code: 'INVALID_URL' }, { status: 400 });
  }
  if (!selector || !KNOWN_SELECTORS.has(selector)) {
    await gate.fail({ ...operation, failureCode: 'validation_failed', failureReason: 'Invalid format selector' });
    return NextResponse.json({ error: 'Invalid format selector.', code: 'FORMAT_UNAVAILABLE' }, { status: 400 });
  }
  const activeOperationId = await gate.begin({ ...operation, sourceUrl: pageUrl });
  if (!activeOperationId) return NextResponse.json({ error: 'Unable to start this download. Please try again.' }, { status: 500 });
  const activeOperation = { ...operation, operationId: activeOperationId, sourceUrl: pageUrl };

  const dir = await mkdtemp(path.join(tmpdir(), 'savdown-tiktok-'));
  const videoPath = path.join(dir, `v-${randomUUID()}.mp4`);
  const mp3Path   = path.join(dir, `a-${randomUUID()}.mp3`);

  try {
    try {
      await execFileAsync(YTDLP_BIN, [
        '--no-playlist', '--no-warnings',
        '--socket-timeout', '25', '--retries', '2',
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

    if (!extractAudio) {
      const buffer = await readFile(videoPath);
      if (!(await gate.spend({ ...activeOperation, description: 'TikTok video download' }))) {
        await gate.fail({ ...activeOperation, failureCode: 'credit_commit_failed', failureReason: 'Credit balance changed before completion' });
        return NextResponse.json(
          { error: 'Your balance changed before this could be charged. Please retry.' },
          { status: 402 },
        );
      }
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type':        'video/mp4',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length':      String(buffer.length),
          'Cache-Control':       'no-store',
        },
      });
    }

    try {
      await execFileAsync(FFMPEG_BIN, [
        '-y', '-i', videoPath,
        '-vn', '-c:a', 'libmp3lame', '-b:a', '192k',
        mp3Path,
      ], { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 });
    } catch {
      await gate.fail({
        ...activeOperation,
        failureCode: 'processing_failed',
        failureReason: 'Audio extraction failed',
      });
      return NextResponse.json({ error: 'Could not extract audio from this video.' }, { status: 502 });
    }

    const buffer = await readFile(mp3Path);
    if (!(await gate.spend({ ...activeOperation, description: 'TikTok audio download' }))) {
      await gate.fail({ ...activeOperation, failureCode: 'credit_commit_failed', failureReason: 'Credit balance changed before completion' });
      return NextResponse.json(
        { error: 'Your balance changed before this could be charged. Please retry.' },
        { status: 402 },
      );
    }
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(buffer.length),
        'Cache-Control':       'no-store',
      },
    });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
