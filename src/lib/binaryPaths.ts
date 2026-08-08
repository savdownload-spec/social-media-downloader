/**
 * Resolves the binaries used by the downloader/media services.
 *
 * Local dev sets YTDLP_BIN/FFMPEG_BIN explicitly in .env.local, pointing at
 * binaries installed on the developer's machine. Production (Vercel) has no
 * such local install, so when those env vars are absent this falls back to
 * binaries bundled with the deployment itself:
 *   - yt-dlp: the official static Linux binary, committed under bin/
 *     (curl_cffi — needed for TikTok's --impersonate bypass — is bundled
 *     into yt-dlp's own official Linux build, confirmed via their release
 *     requirements file, so this covers impersonation too).
 *   - ffmpeg: the `ffmpeg-static` npm package, which downloads the correct
 *     binary for whatever platform runs `npm install` (Linux x64 on
 *     Vercel's build, matching what actually deploys).
 *
 * gallery-dl has no equivalent official standalone binary (Python-only, no
 * PyInstaller release artifact), so it cannot be bundled this way — see
 * gallerydl.ts for how that's handled.
 */
import path from 'path';
import { existsSync, chmodSync } from 'fs';

const BUNDLED_YTDLP_PATH = path.join(process.cwd(), 'bin', 'yt-dlp_linux');

let ffmpegStaticPath: string | null = null;
try {
  ffmpegStaticPath = require('ffmpeg-static') as string | null;
} catch {
  ffmpegStaticPath = null;
}

/** Best-effort: bundled binaries need the executable bit set at runtime —
 *  git/zip packaging across platforms doesn't always preserve it. */
function ensureExecutable(binPath: string): string {
  try {
    if (existsSync(binPath)) chmodSync(binPath, 0o755);
  } catch {
    // Read-only filesystem or already executable — safe to ignore.
  }
  return binPath;
}

export function getYtdlpBin(): string {
  if (process.env.YTDLP_BIN) return process.env.YTDLP_BIN;
  if (existsSync(BUNDLED_YTDLP_PATH)) return ensureExecutable(BUNDLED_YTDLP_PATH);
  return 'yt-dlp'; // fall back to PATH
}

export function getFfmpegBin(): string {
  if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN;
  if (ffmpegStaticPath && existsSync(ffmpegStaticPath)) return ensureExecutable(ffmpegStaticPath);
  return 'ffmpeg'; // fall back to PATH
}

export function getGalleryDlBin(): string {
  // No bundled option available for gallery-dl — see module doc comment.
  return process.env.GALLERY_DL_BIN || 'gallery-dl';
}
