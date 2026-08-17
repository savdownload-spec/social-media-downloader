/**
 * GET /api/tools/tiktok/stream?url=<tiktok page url>&selector=<format selector>&filename=<name>&audio=1
 *
 * TikTok's CDN binds signed stream URLs to the exact curl_cffi session that
 * resolved them via yt-dlp's --impersonate. A separate later fetch (even one
 * that replays the same headers/cookies/TLS fingerprint) gets rejected with
 * a 403. The only reliable fix is to have yt-dlp download the bytes itself,
 * in the same invocation, and hand the file back to the browser, so this
 * route re-runs the resolution + download in one shot instead of reusing a
 * previously-resolved CDN URL.
 *
 * TikTok also has no separate audio-only stream (only muxed video+audio),
 * so `audio=1` runs the downloaded file through FFmpeg to extract an MP3.
 *
 * Downloads to a temp file rather than piping live, TikTok videos are a
 * few MB at most, and this avoids partial/broken HTTP responses when
 * extraction fails mid-stream (matches the temp-file pattern in
 * src/lib/videoService.ts).
 *
 * Architecture: API Route → yt-dlp binary (temp file) [→ FFmpeg] → response
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { needsImpersonation, KNOWN_SELECTORS } from '@/lib/ytdlp';
import { getYtdlpBin, getFfmpegBin } from '@/lib/binaryPaths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

const YTDLP_BIN      = getYtdlpBin();
const FFMPEG_BIN      = getFfmpegBin();
const DOWNLOAD_TIMEOUT = parseInt(process.env.YTDLP_TIMEOUT_MS || '45000', 10) * 2; // real download, not metadata, allow more time

export async function GET(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`ttstream:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  // Credits are spent only once the job below succeeds.
  const gate = await requireCredits({ cost: JOB_COST.proxyDownload });
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const pageUrl      = searchParams.get('url');
  const selector     = searchParams.get('selector');
  const extractAudio = searchParams.get('audio') === '1';
  const filename      = (searchParams.get('filename') || 'tiktok-download').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 200);

  if (!pageUrl || !needsImpersonation(pageUrl)) {
    return NextResponse.json({ error: 'Invalid or unsupported URL.' }, { status: 400 });
  }
  if (!selector || !KNOWN_SELECTORS.has(selector)) {
    return NextResponse.json({ error: 'Invalid format selector.' }, { status: 400 });
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'savdown-tiktok-'));
  const videoPath = path.join(dir, `v-${randomUUID()}.mp4`);
  const mp3Path   = path.join(dir, `a-${randomUUID()}.mp3`);

  try {
    try {
      await execFileAsync(YTDLP_BIN, [
        '--no-playlist', '--no-warnings',
        '--socket-timeout', '25', '--retries', '2',
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
      return NextResponse.json({ error: friendly }, { status: 502 });
    }

    if (!extractAudio) {
      const buffer = await readFile(videoPath);
      if (!(await gate.spend('TikTok video download'))) {
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
      return NextResponse.json({ error: 'Could not extract audio from this video.' }, { status: 502 });
    }

    const buffer = await readFile(mp3Path);
    if (!(await gate.spend('TikTok audio download'))) {
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
