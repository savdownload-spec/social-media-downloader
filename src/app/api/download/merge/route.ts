/**
 * GET /api/download/merge?url=<source page url>&height=<max height>&filename=<name>
 *
 * Most platforms (YouTube especially) only serve resolutions above ~360p as
 * separate video-only and audio-only DASH streams — there is no single CDN
 * URL that contains both. Handing back a raw video-only stream URL (as a
 * plain proxy would) produces a "video" with no sound.
 *
 * This route has yt-dlp download+merge both tracks server-side (via FFmpeg)
 * into one real MP4, then serves that file — the same "download to a temp
 * file, then serve it" pattern used for TikTok, generalized for any
 * yt-dlp-supported platform.
 *
 * Architecture: API Route → yt-dlp (+ FFmpeg merge) → temp file → response
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

const YTDLP_BIN        = process.env.YTDLP_BIN  || 'yt-dlp';
const FFMPEG_BIN        = process.env.FFMPEG_BIN || 'ffmpeg';
const DOWNLOAD_TIMEOUT   = parseInt(process.env.YTDLP_TIMEOUT_MS || '45000', 10) * 2; // real download, not metadata

export async function GET(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`dlmerge:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const pageUrl   = searchParams.get('url');
  const heightRaw = searchParams.get('height');
  const filename  = (searchParams.get('filename') || 'video').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 200);

  if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) {
    return NextResponse.json({ error: 'Invalid or missing source URL.' }, { status: 400 });
  }
  const height = heightRaw ? parseInt(heightRaw, 10) : NaN;
  if (!Number.isInteger(height) || height < 1 || height > 4320) {
    return NextResponse.json({ error: 'Invalid quality.' }, { status: 400 });
  }

  const dir     = await mkdtemp(path.join(tmpdir(), 'savdown-merge-'));
  const outPath = path.join(dir, `v-${randomUUID()}.mp4`);

  try {
    try {
      // yt-dlp's --ffmpeg-location, when given a directory, only looks for a
      // binary literally named "ffmpeg"/"ffmpeg.exe" — our FFMPEG_BIN is a
      // versioned filename (e.g. from the imageio_ffmpeg package), so it
      // must be passed as the exact binary path, not its containing folder.
      await execFileAsync(YTDLP_BIN, [
        '--no-playlist', '--no-warnings',
        '--socket-timeout', '25', '--retries', '2',
        '--ffmpeg-location', FFMPEG_BIN,
        '-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`,
        '--merge-output-format', 'mp4',
        '-o', outPath,
        '--', pageUrl,
      ], { timeout: DOWNLOAD_TIMEOUT, maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = msg.includes('Requested format is not available')
        ? 'This quality is not available for this video.'
        : msg.includes('Private video') || msg.includes('private')
        ? 'This video is private and cannot be downloaded.'
        : 'Could not download this video.';
      return NextResponse.json({ error: friendly }, { status: 502 });
    }

    const buffer = await readFile(outPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(buffer.length),
        'Cache-Control':       'no-store',
      },
    });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
