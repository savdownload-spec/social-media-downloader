/**
 * yt-dlp service layer.
 *
 * Spawns yt-dlp as a child process and returns structured DownloadResult.
 * Falls back gracefully to DOWNLOADER_API_URL if yt-dlp binary is not
 * available (production containers that don't bundle it).
 *
 * Architecture: API Route → ytdlp.ts → yt-dlp binary (or DOWNLOADER_API_URL)
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { DownloadResult, DownloadFormat } from '@/types';

const execFileAsync = promisify(execFile);

// Where yt-dlp lives. Override via env for Docker deployments.
const YTDLP_BIN = process.env.YTDLP_BIN || 'yt-dlp';
// Max time to wait for yt-dlp metadata extraction (ms)
const YTDLP_TIMEOUT = parseInt(process.env.YTDLP_TIMEOUT_MS || '30000', 10);
// Max retries on transient failures
const MAX_RETRIES = 2;

export type YtdlpOptions = {
  audioOnly?: boolean;
  /** 'thumbnail' mode returns only thumbnail URLs */
  thumbnailOnly?: boolean;
  /** 'playlist' mode returns all entries */
  playlist?: boolean;
};

/**
 * Check if yt-dlp binary exists and is executable.
 */
async function isBinaryAvailable(): Promise<boolean> {
  try {
    await execFileAsync(YTDLP_BIN, ['--version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run yt-dlp with --dump-json to get media metadata without downloading.
 */
async function runYtdlpJson(url: string, extraArgs: string[] = []): Promise<Record<string, unknown>[]> {
  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    '--no-call-home',
    '--socket-timeout', '20',
    '--retries', '2',
    ...extraArgs,
    '--',
    url,
  ];

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { stdout } = await execFileAsync(YTDLP_BIN, args, {
        timeout: YTDLP_TIMEOUT,
        maxBuffer: 10 * 1024 * 1024, // 10 MB
      });
      // stdout may be multiple JSON lines (playlist)
      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) await sleep(500 * (attempt + 1));
    }
  }
  throw lastError ?? new Error('yt-dlp failed');
}

/** Sleep helper */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Format bytes to a human-readable size string.
 */
function formatBytes(bytes: number | null | undefined): string | undefined {
  if (!bytes) return undefined;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract quality label from yt-dlp format entry.
 */
function qualityLabel(fmt: Record<string, unknown>): string {
  const height = fmt.height as number | null;
  const abr = fmt.abr as number | null;
  const ext = fmt.ext as string;
  if (height) return `${height}p`;
  if (abr) return `${Math.round(abr)}kbps`;
  if (ext === 'mp3') return 'MP3';
  if (ext === 'm4a') return 'M4A';
  return (fmt.format_note as string) || (fmt.format as string) || 'Unknown';
}

/**
 * Build user-facing format label.
 */
function buildLabel(fmt: Record<string, unknown>): string {
  const ext = (fmt.ext as string || 'mp4').toUpperCase();
  const height = fmt.height as number | null;
  const abr = fmt.abr as number | null;
  if (height) return `${ext} ${height}p`;
  if (abr) return `${ext} ${Math.round(abr)}kbps`;
  return ext;
}

/**
 * Build a direct download URL for a specific format.
 * We proxy through our own /api/proxy endpoint to avoid CORS and expose clean URLs.
 */
function proxyUrl(originalUrl: string, filename: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const params = new URLSearchParams({ url: originalUrl, filename });
  return `${base}/api/proxy?${params.toString()}`;
}

/**
 * Main entry point: resolve a URL to DownloadResult using yt-dlp.
 */
export async function resolveWithYtdlp(
  url: string,
  toolSlug: string,
  options: YtdlpOptions = {},
): Promise<DownloadResult> {
  // Check if binary is available
  const available = await isBinaryAvailable();
  if (!available) {
    // Fall back to external DOWNLOADER_API_URL if set
    return resolveViaRemoteApi(url, toolSlug);
  }

  try {
    if (options.thumbnailOnly) {
      return await resolveThumbnail(url);
    }

    const extraArgs: string[] = [];
    if (options.playlist) {
      // Remove --no-playlist for playlist mode
    }
    if (options.audioOnly) {
      extraArgs.push('--format', 'bestaudio/best');
    }

    const entries = await runYtdlpJson(url, extraArgs);
    if (!entries.length) {
      return { ok: false, error: 'No media found at this URL.' };
    }

    const entry = entries[0]!;
    const title = (entry.title as string) || (entry.webpage_url_basename as string) || 'Download';
    const thumbnail = (entry.thumbnail as string) || '';
    const author = (entry.uploader as string) || (entry.channel as string) || undefined;
    const duration = entry.duration as number | undefined;
    const platform = (entry.extractor_key as string) || toolSlug;

    // Build format list from yt-dlp formats array
    const rawFormats = (entry.formats as Record<string, unknown>[] | undefined) || [];

    let formats: DownloadFormat[] = [];

    if (options.audioOnly) {
      // Audio-only: pick best audio formats
      const audioFmts = rawFormats.filter((f) =>
        f.vcodec === 'none' || f.acodec !== 'none'
      );
      // Deduplicate by ext
      const seen = new Set<string>();
      for (const f of audioFmts.reverse()) {
        const ext = (f.ext as string || 'mp3');
        if (!seen.has(ext) && ['mp3', 'm4a', 'webm', 'ogg'].includes(ext)) {
          seen.add(ext);
          const dl = (f.url as string) || '';
          formats.push({
            label: buildLabel(f),
            quality: qualityLabel(f),
            extension: ext,
            size: formatBytes(f.filesize as number),
            url: dl ? proxyUrl(dl, `${sanitizeFilename(title)}.${ext}`) : '#',
            hasAudio: true,
            hasVideo: false,
          });
        }
        if (formats.length >= 3) break;
      }
    } else {
      // Video formats: pick unique heights
      const videoFmts = rawFormats
        .filter((f) => f.height && f.acodec !== 'none' && f.ext === 'mp4')
        .sort((a, b) => ((b.height as number) || 0) - ((a.height as number) || 0));

      const seenHeights = new Set<number>();
      for (const f of videoFmts) {
        const h = f.height as number;
        if (!seenHeights.has(h)) {
          seenHeights.add(h);
          const dl = (f.url as string) || '';
          formats.push({
            label: buildLabel(f),
            quality: `${h}p`,
            extension: 'mp4',
            size: formatBytes(f.filesize as number),
            url: dl ? proxyUrl(dl, `${sanitizeFilename(title)}.mp4`) : '#',
            hasAudio: true,
            hasVideo: true,
          });
        }
        if (formats.length >= 4) break;
      }

      // Always offer MP3 as audio fallback
      const bestAudio = rawFormats
        .filter((f) => f.vcodec === 'none' && f.acodec !== 'none')
        .sort((a, b) => ((b.abr as number) || 0) - ((a.abr as number) || 0))[0];
      if (bestAudio) {
        const dl = (bestAudio.url as string) || '';
        formats.push({
          label: 'MP3 audio',
          quality: qualityLabel(bestAudio),
          extension: 'mp3',
          size: formatBytes(bestAudio.filesize as number),
          url: dl ? proxyUrl(dl, `${sanitizeFilename(title)}.mp3`) : '#',
          hasAudio: true,
          hasVideo: false,
        });
      }
    }

    if (!formats.length) {
      // Fallback: use the direct webpage URL
      const directUrl = (entry.url as string) || (entry.webpage_url as string) || '';
      formats = [{
        label: 'Download',
        quality: 'best',
        extension: 'mp4',
        url: directUrl ? proxyUrl(directUrl, `${sanitizeFilename(title)}.mp4`) : '#',
        hasAudio: true,
        hasVideo: true,
      }];
    }

    return {
      ok: true,
      title,
      thumbnail,
      author,
      duration,
      platform,
      formats,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Parse common yt-dlp error messages into user-friendly ones
    if (msg.includes('Private video') || msg.includes('private')) {
      return { ok: false, error: 'This video is private and cannot be downloaded.' };
    }
    if (msg.includes('not available') || msg.includes('removed')) {
      return { ok: false, error: 'This media is no longer available.' };
    }
    if (msg.includes('geo') || msg.includes('blocked')) {
      return { ok: false, error: 'This content is not available in the server region.' };
    }
    if (msg.includes('Unsupported URL')) {
      return { ok: false, error: 'This URL is not supported.' };
    }
    return { ok: false, error: `Could not process this URL. ${msg.slice(0, 120)}` };
  }
}

/**
 * Resolve YouTube thumbnail URLs directly from img.youtube.com CDN.
 * No yt-dlp binary needed for this path.
 */
async function resolveThumbnail(url: string): Promise<DownloadResult> {
  // Extract video ID from any YouTube URL format
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  let videoId: string | null = null;
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) { videoId = match[1]; break; }
  }

  if (!videoId) {
    return { ok: false, error: 'Could not extract video ID from this YouTube URL.' };
  }

  // YouTube thumbnail endpoints
  const thumbnailVariants = [
    { label: 'MaxRes JPG', quality: '1280×720', url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, extension: 'jpg' },
    { label: 'HQ JPG',     quality: '480×360',  url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,     extension: 'jpg' },
    { label: 'MQ JPG',     quality: '320×180',  url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,     extension: 'jpg' },
    { label: 'SD JPG',     quality: '120×90',   url: `https://img.youtube.com/vi/${videoId}/default.jpg`,       extension: 'jpg' },
  ];

  // Verify maxres actually exists (some old videos don't have it)
  const formats: DownloadFormat[] = [];
  for (const v of thumbnailVariants) {
    if (v.label === 'MaxRes JPG') {
      try {
        const check = await fetch(v.url, { method: 'HEAD' });
        if (!check.ok) continue;
      } catch { continue; }
    }
    formats.push({
      label: v.label,
      quality: v.quality,
      extension: v.extension,
      url: v.url,
      hasAudio: false,
      hasVideo: false,
    });
  }

  return {
    ok: true,
    title: `YouTube Video Thumbnail (${videoId})`,
    thumbnail: formats[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    platform: 'youtube',
    formats,
  };
}

/** Sanitize a title for use as a filename. */
function sanitizeFilename(title: string): string {
  return title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80);
}

/**
 * Fallback: delegate to DOWNLOADER_API_URL (the existing external service path).
 */
async function resolveViaRemoteApi(url: string, toolSlug: string): Promise<DownloadResult> {
  const apiUrl = process.env.DOWNLOADER_API_URL;
  if (!apiUrl) {
    return {
      ok: false,
      error: 'Downloader service is not configured. Set YTDLP_BIN or DOWNLOADER_API_URL.',
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
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return { ok: false, error: `Remote downloader responded ${res.status}.` };
    return (await res.json()) as DownloadResult;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Remote downloader failed.' };
  }
}
