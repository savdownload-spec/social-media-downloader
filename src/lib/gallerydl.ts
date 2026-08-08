/**
 * gallery-dl service layer.
 *
 * gallery-dl is an open-source CLI tool (GPL-2.0) that downloads image
 * galleries from Instagram, Pinterest, Twitter/X, and 300+ other sites.
 *
 * Architecture: API Route → gallerydl.ts → gallery-dl binary
 *
 * Supported tools:
 *   - instagram-photo-downloader      (public posts / carousels)
 *   - instagram-story-downloader      (public stories)
 *   - instagram-profile-picture-downloader
 *   - pinterest-image-downloader
 *   - x-gif-downloader                (image/gif extraction)
 *   - tiktok-photo-downloader         (photo slideshows)
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { DownloadResult, DownloadFormat } from '@/types';
import { getGalleryDlBin } from '@/lib/binaryPaths';

const execFileAsync = promisify(execFile);

// Unlike yt-dlp/ffmpeg, gallery-dl has no official standalone binary release
// (Python-only, no PyInstaller artifact), so it can't be bundled into a
// serverless deployment the same way — it needs GALLERY_DL_BIN pointing at
// an install on a persistent server (VPS/Docker/sidecar), or it falls back
// to expecting `gallery-dl` on PATH, which won't exist on Vercel.
const GDL_BIN     = getGalleryDlBin();
const GDL_TIMEOUT = parseInt(process.env.GALLERY_DL_TIMEOUT_MS || '30000', 10);
const MAX_RETRIES = 2;

/* ─── helpers ───────────────────────────────────────────────── */

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function isBinaryAvailable(): Promise<boolean> {
  try {
    await execFileAsync(GDL_BIN, ['--version'], { timeout: 5000 });
    return true;
  } catch { return false; }
}

function proxyUrl(originalUrl: string, filename: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return `${base}/api/proxy?${new URLSearchParams({ url: originalUrl, filename })}`;
}

function guessExt(url: string): string {
  const m = url.match(/\.(jpg|jpeg|png|gif|webp|mp4|mp3)(\?|$)/i);
  return m ? m[1]!.toLowerCase() : 'jpg';
}

/**
 * Run gallery-dl with --dump-json to extract metadata without saving files.
 */
async function runGdlJson(
  url: string,
  extraArgs: string[] = [],
): Promise<Record<string, unknown>[][]> {
  const args = [
    '--dump-json',
    '--no-mtime',
    ...extraArgs,
    '--',
    url,
  ];

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { stdout } = await execFileAsync(GDL_BIN, args, {
        timeout: GDL_TIMEOUT,
        maxBuffer: 20 * 1024 * 1024,
      });
      // Each line is a JSON array: [metadata, url1, url2, ...]
      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line) as Record<string, unknown>[]);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) await sleep(600 * (attempt + 1));
    }
  }
  throw lastError ?? new Error('gallery-dl failed');
}

/* ─── main resolver ─────────────────────────────────────────── */

export async function resolveWithGalleryDl(
  url: string,
  toolSlug: string,
): Promise<DownloadResult> {
  const available = await isBinaryAvailable();
  if (!available) {
    return {
      ok: false,
      error:
        'gallery-dl is not installed on this server. ' +
        'Set GALLERY_DL_BIN or install gallery-dl to enable this tool.',
    };
  }

  try {
    const extraArgs: string[] = [];

    // Instagram profile picture: use --range 1 to only get the avatar
    if (toolSlug === 'instagram-profile-picture-downloader') {
      extraArgs.push('--range', '1');
    }
    // Stories: target stories endpoint
    if (toolSlug === 'instagram-story-downloader') {
      extraArgs.push('--cookies-from-browser', 'none');
    }

    const entries = await runGdlJson(url, extraArgs);
    if (!entries.length) {
      return { ok: false, error: 'No media found at this URL.' };
    }

    const formats: DownloadFormat[] = [];
    let title = 'Download';
    let thumbnail = '';
    let author: string | undefined;

    for (const entry of entries.slice(0, 35)) {
      // entry[0] is the metadata object, rest are URLs (or it's all metadata)
      const meta = entry[0] as Record<string, unknown> | undefined;
      if (!meta) continue;

      // Extract metadata from first entry
      if (!title || title === 'Download') {
        title =
          (meta.title as string) ||
          (meta.description as string)?.slice(0, 80) ||
          (meta.post_shortcode as string) ||
          (meta.filename as string) ||
          'Media';
      }
      if (!author) {
        author =
          (meta.uploader as string) ||
          (meta.owner as Record<string,string> | undefined)?.username ||
          (meta.username as string);
      }
      if (!thumbnail) {
        thumbnail =
          (meta.display_url as string) ||
          (meta.thumbnail as string) ||
          '';
      }

      // URLs can be the metadata url field, or additional array entries
      const urls: string[] = [];
      if (meta.url) urls.push(meta.url as string);
      if (meta.display_url) urls.push(meta.display_url as string);
      if (meta.video_url) urls.push(meta.video_url as string);
      // Additional URL entries in the dump
      for (let i = 1; i < entry.length; i++) {
        if (typeof entry[i] === 'string') urls.push(entry[i] as unknown as string);
      }

      for (const mediaUrl of urls) {
        const ext = guessExt(mediaUrl);
        const filename = `${sanitize(title)}-${formats.length + 1}.${ext}`;
        const isVideo = ['mp4', 'webm'].includes(ext);
        formats.push({
          label: isVideo
            ? `Video ${formats.length + 1}`
            : `Image ${formats.length + 1}`,
          quality: ext.toUpperCase(),
          extension: ext,
          url: proxyUrl(mediaUrl, filename),
          hasAudio: isVideo,
          hasVideo: isVideo,
        });
        if (formats.length >= 35) break;
      }
      if (formats.length >= 35) break;
    }

    // Profile picture special handling — single image, relabelled
    if (toolSlug === 'instagram-profile-picture-downloader' && formats.length > 0) {
      formats[0]!.label = 'Profile Picture HD';
    }

    if (!formats.length) {
      return { ok: false, error: 'Could not extract media from this URL.' };
    }

    // If multiple images, offer a ZIP label hint (actual ZIP served separately)
    const hasMultiple = formats.length > 1;

    return {
      ok: true,
      title,
      thumbnail,
      author,
      platform: toolSlug,
      formats: hasMultiple
        ? [
            ...formats,
            {
              label: '⬇ Download All (ZIP)',
              quality: 'ZIP',
              extension: 'zip',
              url: `/api/tools/gallery-dl/zip?url=${encodeURIComponent(url)}&tool=${toolSlug}`,
              hasAudio: false,
              hasVideo: false,
            },
          ]
        : formats,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('private') || msg.includes('login')) {
      return { ok: false, error: 'This content requires login and cannot be accessed.' };
    }
    if (msg.includes('not found') || msg.includes('404')) {
      return { ok: false, error: 'Content not found. It may have been deleted.' };
    }
    if (msg.includes('Unsupported')) {
      return { ok: false, error: 'This URL is not supported by gallery-dl.' };
    }
    return { ok: false, error: `Download failed: ${msg.slice(0, 120)}` };
  }
}

function sanitize(s: string): string {
  return s.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_').slice(0, 60);
}
