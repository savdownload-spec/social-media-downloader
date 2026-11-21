/**
 * GET /api/download/audio?url=<page url>&bitrate=320&filename=<name>
 *
 * Downloads the best available audio stream with yt-dlp and encodes a real
 * MP3 with FFmpeg. Output is streamed from a temp file, so files are not
 * subject to Vercel's 4.5 MB buffered-response limit.
 *
 * Architecture: API Route → yt-dlp (+ FFmpeg encode) → temp file → stream
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

const ALLOWED_BITRATES = new Set([128, 192, 320]);

export async function GET(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`dlaudio:${ip}`, { limit: 10, windowSeconds: 60, fallbackToMemory: true });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.', code: 'PROVIDER_RATE_LIMITED' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const pageUrl     = searchParams.get('url');
  const bitrateRaw  = parseInt(searchParams.get('bitrate') || '320', 10);
  const bitrate     = ALLOWED_BITRATES.has(bitrateRaw) ? bitrateRaw : 320;
  const operationId = searchParams.get('operationId') ?? undefined;
  const tool        = searchParams.get('tool') || 'youtube-to-mp3';
  const platform    = searchParams.get('platform') || 'youtube';
  const filename    = (searchParams.get('filename') || 'audio.mp3').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 200);

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

  const operation = {
    tool, platform, operationId, sourceUrl: pageUrl,
    idempotencyKey: requestIdempotencyKey(req),
  };
  const gate = await requireCredits({ cost: JOB_COST.proxyDownload, request: req, operation });
  if (!gate.ok) return gate.response;
  const activeOperationId = await gate.begin(operation);
  if (!activeOperationId) {
    return NextResponse.json({ error: 'Unable to start this download. Please try again.' }, { status: 500 });
  }
  const activeOperation = { ...operation, operationId: activeOperationId };

  const dir = await mkdtemp(path.join(tmpdir(), 'savdown-audio-'));
  const outPath = path.join(dir, `a-${randomUUID()}.mp3`);
  let streaming = false;

  try {
    try {
      const args = [
        '--no-playlist', '--no-warnings',
        '--socket-timeout', '25', '--retries', '2',
        '--force-ipv4',
        '--ffmpeg-location', FFMPEG_BIN,
        '-f', 'bestaudio/best',
        '-x', '--audio-format', 'mp3',
        '--audio-quality', `${bitrate}K`,
        '-o', outPath,
        '--', pageUrl,
      ];
      if (/(?:^|\.)youtube\.com$|^youtu\.be$/.test(new URL(pageUrl).hostname)) {
        const urlIndex = args.indexOf('--');
        args.splice(urlIndex, 0,
          '--js-runtimes', 'node',
          '--extractor-args', 'youtube:player_client=default,tv,web_safari',
        );
      }
      await execFileAsync(YTDLP_BIN, args, { timeout: DOWNLOAD_TIMEOUT, maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = msg.includes('Sign in to confirm') || msg.includes('not a bot')
        ? 'The platform is temporarily blocking automated requests from this server. Please try again later.'
        : msg.includes('Private video') || msg.includes('private')
        ? 'This content is private and cannot be downloaded.'
        : msg.includes('not available') || msg.includes('removed')
        ? 'This media is no longer available.'
        : 'Could not convert this audio.';
      await gate.fail({ ...activeOperation, failureCode: 'processing_failed', failureReason: friendly });
      return NextResponse.json({ error: friendly, code: 'PROCESSING_FAILED' }, { status: 502 });
    }

    const { size } = await stat(outPath).catch(() => ({ size: 0 }));
    if (!size) {
      await gate.fail({ ...activeOperation, failureCode: 'empty_output', failureReason: 'Empty output file' });
      return NextResponse.json({ error: 'The audio conversion produced no file. No credits were charged.', code: 'PROCESSING_FAILED' }, { status: 502 });
    }

    if (!(await gate.spend({ ...activeOperation, description: `MP3 ${bitrate}kbps` }))) {
      await gate.fail({ ...activeOperation, failureCode: 'credit_commit_failed', failureReason: 'Credit balance changed before completion' });
      return NextResponse.json({ error: 'Your balance changed before this could be charged. Please retry.' }, { status: 402 });
    }

    const fileStream = createReadStream(outPath);
    streaming = true;
    fileStream.on('close', () => { void rm(dir, { recursive: true, force: true }).catch(() => {}); });
    fileStream.on('error', () => { void rm(dir, { recursive: true, force: true }).catch(() => {}); });

    return new NextResponse(Readable.toWeb(fileStream) as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        'Content-Type':        'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(size),
        'Cache-Control':       'no-store',
      },
    });
  } finally {
    if (!streaming) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
