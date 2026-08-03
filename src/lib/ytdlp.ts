/**
 * yt-dlp service layer.
 *
 * Uses yt-dlp's --print / --format selectors to get exactly the streams we
 * want without downloading the full multi-megabyte --dump-json blob.
 *
 * Architecture: API Route → ytdlp.ts → yt-dlp binary (or DOWNLOADER_API_URL)
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { DownloadResult, DownloadFormat } from '@/types';

const execFileAsync = promisify(execFile);

const YTDLP_BIN     = process.env.YTDLP_BIN     || 'yt-dlp';
const YTDLP_TIMEOUT = parseInt(process.env.YTDLP_TIMEOUT_MS || '45000', 10);
const MAX_RETRIES   = 2;

export type YtdlpOptions = {
  audioOnly?:    boolean;
  thumbnailOnly?: boolean;
  playlist?:     boolean;
};

/* ─── binary check ──────────────────────────────────────────── */

async function isBinaryAvailable(): Promise<boolean> {
  try {
    await execFileAsync(YTDLP_BIN, ['--version'], { timeout: 5000 });
    return true;
  } catch { return false; }
}

/* ─── helpers ───────────────────────────────────────────────── */

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function formatBytes(bytes: number | null | undefined): string | undefined {
  if (!bytes || bytes <= 0) return undefined;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitize(title: string): string {
  return title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80);
}

function proxyUrl(rawUrl: string, filename: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return `${base}/api/proxy?${new URLSearchParams({ url: rawUrl, filename })}`;
}

/* ─── core yt-dlp runner ─────────────────────────────────────── */

interface YtdlpMeta {
  title:     string;
  thumbnail: string;
  uploader:  string;
  duration:  number;
  platform:  string;
}

/**
 * Get metadata (title, thumbnail, uploader, duration) via --print.
 * Much smaller output than --dump-json.
 */
async function getMeta(url: string): Promise<YtdlpMeta> {
  const template = [
    '%(title)s',
    '%(thumbnail)s',
    '%(uploader|channel)s',
    '%(duration)s',
    '%(extractor_key)s',
  ].join('\n---FIELD---\n');

  const args = [
    '--no-playlist', '--no-warnings', '--no-call-home',
    '--socket-timeout', '20', '--retries', '2',
    '--print', template,
    '--', url,
  ];

  let last: Error | null = null;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      const { stdout } = await execFileAsync(YTDLP_BIN, args, {
        timeout: YTDLP_TIMEOUT,
        maxBuffer: 512 * 1024, // 512 KB — plenty for metadata
      });
      const [title = '', thumbnail = '', uploader = '', durationStr = '', platform = ''] =
        stdout.trim().split('\n---FIELD---\n').map(s => s.trim());
      return {
        title:     title     || 'Download',
        thumbnail: thumbnail || '',
        uploader:  uploader  || '',
        duration:  parseFloat(durationStr) || 0,
        platform:  platform  || 'youtube',
      };
    } catch (err) {
      last = err instanceof Error ? err : new Error(String(err));
      if (i < MAX_RETRIES) await sleep(500 * (i + 1));
    }
  }
  throw last ?? new Error('yt-dlp metadata fetch failed');
}

/**
 * Get the direct stream URL for a specific yt-dlp format selector.
 * Returns empty string if the format is not available.
 */
async function getFormatUrl(url: string, formatSelector: string): Promise<{ streamUrl: string; filesize: number }> {
  const args = [
    '--no-playlist', '--no-warnings', '--no-call-home',
    '--socket-timeout', '20', '--retries', '1',
    '-f', formatSelector,
    '--print', '%(url)s\n---FIELD---\n%(filesize|filesize_approx|0)s',
    '--', url,
  ];

  try {
    const { stdout } = await execFileAsync(YTDLP_BIN, args, {
      timeout: YTDLP_TIMEOUT,
      maxBuffer: 256 * 1024,
    });
    const parts = stdout.trim().split('\n---FIELD---\n');
    const streamUrl = parts[0]?.trim() || '';
    const filesize  = parseInt(parts[1]?.trim() || '0', 10) || 0;
    return { streamUrl, filesize };
  } catch {
    return { streamUrl: '', filesize: 0 };
  }
}

/* ─── video quality tiers ────────────────────────────────────── */

// Quality tiers — use single-file format selectors only, since --print
// cannot output a merged DASH stream URL (that requires actual muxing).
// For each tier: prefer a pre-muxed mp4 → fall back to best mp4 DASH video.
const VIDEO_TIERS: { label: string; quality: string; selector: string }[] = [
  { label: 'MP4 2160p (4K)', quality: '2160p', selector: 'bestvideo[height<=2160][ext=mp4][acodec!=none]/bestvideo[height<=2160][ext=mp4]/best[height<=2160]' },
  { label: 'MP4 1440p',      quality: '1440p', selector: 'bestvideo[height<=1440][ext=mp4][acodec!=none]/bestvideo[height<=1440][ext=mp4]/best[height<=1440]' },
  { label: 'MP4 1080p (HD)', quality: '1080p', selector: 'bestvideo[height<=1080][ext=mp4][acodec!=none]/bestvideo[height<=1080][ext=mp4]/best[height<=1080]' },
  { label: 'MP4 720p',       quality: '720p',  selector: 'bestvideo[height<=720][ext=mp4][acodec!=none]/bestvideo[height<=720][ext=mp4]/best[height<=720]'   },
  { label: 'MP4 480p',       quality: '480p',  selector: 'bestvideo[height<=480][ext=mp4][acodec!=none]/bestvideo[height<=480][ext=mp4]/best[height<=480]'   },
  { label: 'MP4 360p',       quality: '360p',  selector: 'best[height<=360][ext=mp4]/bestvideo[height<=360][ext=mp4]/best[height<=360]'                      },
];

// Audio tier for music/podcast downloads
const AUDIO_TIERS: { label: string; quality: string; ext: string; selector: string }[] = [
  { label: 'M4A 128kbps', quality: '128kbps', ext: 'm4a', selector: 'bestaudio[ext=m4a]/bestaudio' },
  { label: 'WebM Audio',  quality: 'high',    ext: 'webm', selector: 'bestaudio[ext=webm]' },
];

/* ─── main resolver ─────────────────────────────────────────── */

export async function resolveWithYtdlp(
  url: string,
  toolSlug: string,
  options: YtdlpOptions = {},
): Promise<DownloadResult> {
  const available = await isBinaryAvailable();
  if (!available) return resolveViaRemoteApi(url, toolSlug);

  try {
    // Thumbnail-only: no yt-dlp needed, direct CDN
    if (options.thumbnailOnly) return resolveThumbnail(url);

    // Step 1: get metadata (fast, small output)
    const meta = await getMeta(url);
    const title     = meta.title;
    const thumbnail = meta.thumbnail;
    const author    = meta.uploader || undefined;
    const duration  = meta.duration || undefined;
    const platform  = meta.platform || toolSlug;

    const formats: DownloadFormat[] = [];

    if (options.audioOnly) {
      // Audio-only mode: fetch best audio streams
      for (const tier of AUDIO_TIERS) {
        const { streamUrl, filesize } = await getFormatUrl(url, tier.selector);
        if (!streamUrl || streamUrl === 'NA') continue;
        formats.push({
          label:    tier.label,
          quality:  tier.quality,
          extension: tier.ext,
          size:     formatBytes(filesize),
          url:      proxyUrl(streamUrl, `${sanitize(title)}.${tier.ext}`),
          hasAudio: true,
          hasVideo: false,
        });
        if (formats.length >= 2) break;
      }
    } else {
      // Video mode: probe each quality tier in parallel (up to 3 at once)
      // We check in order from highest to lowest quality
      const tierResults = await Promise.allSettled(
        VIDEO_TIERS.map(tier => getFormatUrl(url, tier.selector)),
      );

      for (let i = 0; i < VIDEO_TIERS.length; i++) {
        const tier   = VIDEO_TIERS[i]!;
        const result = tierResults[i];
        if (result?.status !== 'fulfilled') continue;
        const { streamUrl, filesize } = result.value;
        if (!streamUrl || streamUrl === 'NA') continue;

        formats.push({
          label:    tier.label,
          quality:  tier.quality,
          extension: 'mp4',
          size:     formatBytes(filesize),
          url:      proxyUrl(streamUrl, `${sanitize(title)}.mp4`),
          hasAudio: true,
          hasVideo: true,
        });
      }

      // Always add best audio (M4A)
      const { streamUrl: audioUrl, filesize: audioSize } =
        await getFormatUrl(url, AUDIO_TIERS[0]!.selector);
      if (audioUrl && audioUrl !== 'NA') {
        formats.push({
          label:    'M4A Audio',
          quality:  'best',
          extension: 'm4a',
          size:     formatBytes(audioSize),
          url:      proxyUrl(audioUrl, `${sanitize(title)}.m4a`),
          hasAudio: true,
          hasVideo: false,
        });
      }
    }

    if (!formats.length) {
      return { ok: false, error: 'No downloadable formats found for this URL.' };
    }

    return { ok: true, title, thumbnail, author, duration, platform, formats };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Private video') || msg.includes('private'))
      return { ok: false, error: 'This video is private and cannot be downloaded.' };
    if (msg.includes('not available') || msg.includes('removed'))
      return { ok: false, error: 'This media is no longer available.' };
    if (msg.includes('geo') || msg.includes('blocked') || msg.includes('not available in your country'))
      return { ok: false, error: 'This content is not available in the server region.' };
    if (msg.includes('Unsupported URL'))
      return { ok: false, error: 'This URL is not supported.' };
    return { ok: false, error: `Could not process this URL. ${msg.slice(0, 160)}` };
  }
}

/* ─── thumbnail resolver (no yt-dlp needed) ─────────────────── */

async function resolveThumbnail(url: string): Promise<DownloadResult> {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  let videoId: string | null = null;
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) { videoId = m[1]; break; }
  }
  if (!videoId)
    return { ok: false, error: 'Could not extract YouTube video ID from this URL.' };

  const base = `https://img.youtube.com/vi/${videoId}`;
  const variants = [
    { label: 'MaxRes JPG', quality: '1280×720', url: `${base}/maxresdefault.jpg` },
    { label: 'HQ JPG',     quality: '480×360',  url: `${base}/hqdefault.jpg`     },
    { label: 'MQ JPG',     quality: '320×180',  url: `${base}/mqdefault.jpg`     },
    { label: 'SD JPG',     quality: '120×90',   url: `${base}/default.jpg`       },
  ];

  // Verify maxres exists (some videos don't have it)
  const formats: DownloadFormat[] = [];
  for (const v of variants) {
    if (v.label === 'MaxRes JPG') {
      try { const r = await fetch(v.url, { method: 'HEAD' }); if (!r.ok) continue; }
      catch { continue; }
    }
    formats.push({ label: v.label, quality: v.quality, extension: 'jpg', url: v.url, hasAudio: false, hasVideo: false });
  }

  return {
    ok: true,
    title:     `YouTube Thumbnail (${videoId})`,
    thumbnail: formats[0]?.url || `${base}/hqdefault.jpg`,
    platform:  'youtube',
    formats,
  };
}

/* ─── remote API fallback ────────────────────────────────────── */

async function resolveViaRemoteApi(url: string, toolSlug: string): Promise<DownloadResult> {
  const apiUrl = process.env.DOWNLOADER_API_URL;
  if (!apiUrl) {
    return { ok: false, error: 'Downloader service is not configured. Set YTDLP_BIN or DOWNLOADER_API_URL.' };
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
