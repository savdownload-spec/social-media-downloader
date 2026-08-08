/**
 * Video processing service using FFmpeg (LGPL/GPL depending on build flags;
 * the standard distro/static builds used here are free for this kind of
 * server-side transcoding — no redistribution of FFmpeg itself occurs).
 *
 * FFmpeg has no buffer-in/buffer-out API for arbitrary containers, so each
 * operation writes the input to a secure temp file, runs FFmpeg against real
 * file paths, reads the result back into a buffer, and always cleans up in a
 * `finally` block — even on failure or timeout.
 *
 * Architecture: API Route → videoService.ts → ffmpeg binary
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { mkdtemp, readFile, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

const FFMPEG_BIN     = process.env.FFMPEG_BIN     || 'ffmpeg';
const FFMPEG_TIMEOUT = parseInt(process.env.FFMPEG_TIMEOUT_MS || '60000', 10);
const MAX_INPUT_BYTES = 100 * 1024 * 1024; // 100 MB
// GIF encoding is inefficient for noisy/high-motion footage — a busy 10s
// clip can produce a huge file. Cap the output so we never silently hand
// back a multi-tens-of-MB "GIF" that will choke on most platforms anyway.
const MAX_GIF_OUTPUT_BYTES = 20 * 1024 * 1024; // 20 MB

export type VideoOperation =
  | { op: 'convert';  format: 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv' }
  | { op: 'compress'; crf?: number } // higher CRF = smaller/lower quality; 28 is a solid default
  | { op: 'to-mp3';   bitrate?: '128k' | '192k' | '320k' }
  | { op: 'to-gif';   fps?: number; width?: number };

export type VideoResult = {
  ok: true;
  buffer: Buffer;
  mimeType: string;
  extension: string;
  originalSize: number;
  outputSize: number;
};

export type VideoError = { ok: false; error: string };

const MIME: Record<string, string> = {
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', gif: 'image/gif',
};

let binaryAvailable: boolean | null = null;
async function isBinaryAvailable(): Promise<boolean> {
  if (binaryAvailable !== null) return binaryAvailable;
  try {
    await execFileAsync(FFMPEG_BIN, ['-version'], { timeout: 5000 });
    binaryAvailable = true;
  } catch {
    binaryAvailable = false;
  }
  return binaryAvailable;
}

/**
 * Run an input buffer through FFmpeg and return the produced file as a buffer.
 * `buildArgs` receives the resolved (inputPath, outputPath) and returns the
 * FFmpeg CLI args (excluding the binary name itself).
 */
async function runFfmpeg(
  input: Buffer,
  inExt: string,
  outExt: string,
  buildArgs: (inputPath: string, outputPath: string) => string[],
): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), 'savdown-ffmpeg-'));
  const inputPath  = path.join(dir, `in-${randomUUID()}.${inExt}`);
  const outputPath = path.join(dir, `out-${randomUUID()}.${outExt}`);

  try {
    await writeFile(inputPath, input);
    const args = buildArgs(inputPath, outputPath);
    await execFileAsync(FFMPEG_BIN, args, {
      timeout: FFMPEG_TIMEOUT,
      maxBuffer: 10 * 1024 * 1024,
    });
    return await readFile(outputPath);
  } finally {
    // Always clean up temp files, success or failure.
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Process a video buffer through the requested operation.
 */
export async function processVideo(
  input: Buffer,
  inputExt: string,
  operation: VideoOperation,
): Promise<VideoResult | VideoError> {
  if (input.length > MAX_INPUT_BYTES) {
    return { ok: false, error: 'File too large. Maximum input size is 100 MB.' };
  }
  if (!(await isBinaryAvailable())) {
    return {
      ok: false,
      error: 'Video processing is temporarily unavailable on this server. FFmpeg is not installed.',
    };
  }

  const safeInExt = /^[a-z0-9]{2,5}$/i.test(inputExt) ? inputExt : 'mp4';

  try {
    let outBuf: Buffer;
    let outExt: string;

    switch (operation.op) {
      case 'convert': {
        outExt = operation.format;
        outBuf = await runFfmpeg(input, safeInExt, outExt, (i, o) => [
          '-y', '-i', i,
          '-movflags', '+faststart',
          o,
        ]);
        break;
      }

      case 'compress': {
        outExt = 'mp4';
        const crf = Math.min(Math.max(operation.crf ?? 28, 18), 40);
        outBuf = await runFfmpeg(input, safeInExt, outExt, (i, o) => [
          '-y', '-i', i,
          '-c:v', 'libx264', '-crf', String(crf), '-preset', 'fast',
          '-c:a', 'aac', '-b:a', '128k',
          '-movflags', '+faststart',
          o,
        ]);
        break;
      }

      case 'to-mp3': {
        outExt = 'mp3';
        const bitrate = operation.bitrate ?? '192k';
        outBuf = await runFfmpeg(input, safeInExt, outExt, (i, o) => [
          '-y', '-i', i,
          '-vn', '-c:a', 'libmp3lame', '-b:a', bitrate,
          o,
        ]);
        break;
      }

      case 'to-gif': {
        outExt = 'gif';
        const fps = Math.min(Math.max(operation.fps ?? 12, 5), 24);
        const width = Math.min(Math.max(operation.width ?? 480, 120), 720);
        // High-quality two-pass palette generation, capped duration to keep
        // GIF file size sane (GIFs beyond ~10s get huge).
        outBuf = await runFfmpeg(input, safeInExt, outExt, (i, o) => [
          '-y', '-i', i,
          '-t', '10',
          '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
          '-loop', '0',
          o,
        ]);
        if (outBuf.length > MAX_GIF_OUTPUT_BYTES) {
          return {
            ok: false,
            error: 'The generated GIF is too large (this clip has a lot of motion/detail). Try a lower frame rate or a shorter, simpler clip.',
          };
        }
        break;
      }

      default: {
        const _exhaustive: never = operation;
        return { ok: false, error: 'Unknown operation.' };
      }
    }

    return {
      ok: true,
      buffer: outBuf,
      mimeType: MIME[outExt] || 'application/octet-stream',
      extension: outExt,
      originalSize: input.length,
      outputSize: outBuf.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ETIMEDOUT') || msg.toLowerCase().includes('timed out')) {
      return { ok: false, error: 'Processing took too long and was cancelled. Try a shorter or smaller video.' };
    }
    if (msg.includes('Invalid data found') || msg.includes('moov atom not found')) {
      return { ok: false, error: 'This file could not be read as a valid video.' };
    }
    return { ok: false, error: `Video processing failed: ${msg.slice(0, 200)}` };
  }
}

/**
 * Convert a remote video URL directly to GIF without the caller having to
 * download it first — used by download-and-convert flows (e.g. X GIF
 * Downloader's "real GIF" option) where we already have a resolved stream URL.
 */
export async function urlToGif(
  sourceUrl: string,
  opts: { fps?: number; width?: number } = {},
): Promise<VideoResult | VideoError> {
  if (!(await isBinaryAvailable())) {
    return { ok: false, error: 'GIF conversion is temporarily unavailable on this server.' };
  }
  const fps = Math.min(Math.max(opts.fps ?? 12, 5), 24);
  const width = Math.min(Math.max(opts.width ?? 480, 120), 720);

  const dir = await mkdtemp(path.join(tmpdir(), 'savdown-ffmpeg-'));
  const outputPath = path.join(dir, `out-${randomUUID()}.gif`);
  try {
    await execFileAsync(FFMPEG_BIN, [
      '-y', '-i', sourceUrl,
      '-t', '10',
      '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
      '-loop', '0',
      outputPath,
    ], { timeout: FFMPEG_TIMEOUT, maxBuffer: 10 * 1024 * 1024 });

    const buffer = await readFile(outputPath);
    if (buffer.length > MAX_GIF_OUTPUT_BYTES) {
      return {
        ok: false,
        error: 'The generated GIF is too large (this clip has a lot of motion/detail) and was not returned.',
      };
    }
    return {
      ok: true,
      buffer,
      mimeType: 'image/gif',
      extension: 'gif',
      originalSize: 0,
      outputSize: buffer.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `GIF conversion failed: ${msg.slice(0, 160)}` };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
