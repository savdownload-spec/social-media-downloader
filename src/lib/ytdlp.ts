/**
 * yt-dlp service layer.
 *
 * One `-J` (dump single JSON) invocation per resolve returns metadata plus
 * the real format list, so availability is derived from what the platform
 * actually serves instead of probing every quality tier separately.
 *
 * Architecture: API Route → ytdlp.ts → yt-dlp binary (or DOWNLOADER_API_URL)
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { DownloadResult, DownloadFormat } from '@/types';
import { getYtdlpBin } from '@/lib/binaryPaths';

const execFileAsync = promisify(execFile);

const YTDLP_BIN     = getYtdlpBin();
const YTDLP_TIMEOUT = parseInt(process.env.YTDLP_TIMEOUT_MS || '30000', 10);
const RESOLVE_TIMEOUT = Math.min(Math.max(YTDLP_TIMEOUT, 15_000), 45_000);

export type YtdlpOptions = {
  audioOnly?:    boolean;
  thumbnailOnly?: boolean;
  thumbnailViaMetadata?: boolean;
  playlist?:     boolean;
  /** Fetch metadata only. Produces no downloadable URLs. */
  metadataOnly?: boolean;
};

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

export function isTiktokHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
    return host === 'tiktok.com' || host.endsWith('.tiktok.com');
  } catch {
    return false;
  }
}

function isYouTubeHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
    return host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be';
  } catch {
    return false;
  }
}

function proxyUrl(rawUrl: string, filename: string): string {
  return `/api/proxy?${new URLSearchParams({ url: rawUrl, filename })}`;
}

function mergeDownloadUrl(pageUrl: string, height: number, filename: string): string {
  return `/api/download/merge?${new URLSearchParams({ url: pageUrl, height: String(height), filename })}`;
}

function audioDownloadUrl(pageUrl: string, bitrate: number, filename: string): string {
  return `/api/download/audio?${new URLSearchParams({
    url: pageUrl,
    bitrate: String(bitrate),
    filename,
  })}`;
}

/**
 * TikTok's CDN binds signed stream URLs to the same impersonated session that
 * resolved them. The stream route re-runs yt-dlp and hands back the bytes so
 * no CDN URL or session cookie ever reaches the browser.
 */
function ttStreamUrl(
  pageUrl: string,
  height: number,
  filename: string,
  opts?: { extractAudio?: boolean },
): string {
  const params: Record<string, string> = { url: pageUrl, height: String(height), filename };
  if (opts?.extractAudio) params.audio = '1';
  return `/api/tools/tiktok/stream?${new URLSearchParams(params)}`;
}

/* ─── binary check ──────────────────────────────────────────── */

async function isBinaryAvailable(): Promise<boolean> {
  try {
    await execFileAsync(YTDLP_BIN, ['--version'], { timeout: 5000 });
    return true;
  } catch { return false; }
}

/* ─── yt-dlp JSON resolver ──────────────────────────────────── */

type YtFormat = {
  url?: string;
  ext?: string;
  width?: number;
  height?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  abr?: number;
  tbr?: number;
  format_id?: string;
};

type YtInfo = {
  title?: string;
  thumbnail?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  extractor_key?: string;
  formats?: YtFormat[];
};

function buildInfoArgs(url: string): string[] {
  const args = [
    '--no-playlist', '--no-warnings', '--no-call-home',
    '--socket-timeout', '20', '--retries', '2',
    '--force-ipv4',
  ];
  // yt-dlp needs a JS runtime for YouTube's current player challenges.
  // Node is present on Vercel and is auto-detected; forcing IPv4 avoids the
  // harsher IPv6 reputation score that triggers the bot wall.
  if (isYouTubeHost(url)) {
    args.push(
      '--js-runtimes', 'node',
      '--extractor-args', 'youtube:player_client=default,tv,web_safari',
    );
  }
  if (isTiktokHost(url)) {
    args.push('--impersonate', 'chrome');
  }
  args.push('-J', '--', url);
  return args;
}

async function getInfo(url: string): Promise<YtInfo> {
  let last: Error | null = null;
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const { stdout } = await execFileAsync(YTDLP_BIN, buildInfoArgs(url), {
        timeout: RESOLVE_TIMEOUT,
        maxBuffer: 64 * 1024 * 1024,
      });
      const info = JSON.parse(stdout) as YtInfo;
      if (!info || typeof info !== 'object') throw new Error('yt-dlp returned invalid JSON');
      return info;
    } catch (err) {
      last = err instanceof Error ? err : new Error(String(err));
      const msg = execErrorMessage(err);
      // Do not hammer the platform after a bot wall; back off once.
      if (attempt === 0 && (msg.includes('Sign in to confirm') || msg.includes('not a bot'))) {
        await sleep(2_000);
        continue;
      }
      if (attempt === 0) await sleep(700);
    }
  }
  throw last ?? new Error('yt-dlp metadata fetch failed');
}

function execErrorMessage(err: unknown): string {
  const execErr = err as (Error & { stderr?: string }) | undefined;
  return execErr?.stderr || (err instanceof Error ? err.message : String(err));
}

function infoMeta(info: YtInfo, fallbackPlatform: string) {
  return {
    title:     info.title?.trim() || 'Download',
    thumbnail: info.thumbnail || '',
    author:    (info.uploader || info.channel) || undefined,
    duration:  info.duration || undefined,
    platform:  info.extractor_key || fallbackPlatform,
  };
}

/* ─── format selection ─────────────────────────────────────── */

const MAX_TIERS = 10;

function labelForHeight(height: number): { label: string; quality: string } {
  if (height >= 4320) return { label: 'MP4 4320p (8K)', quality: '4320p' };
  if (height >= 2160) return { label: 'MP4 2160p (4K)', quality: '2160p' };
  if (height >= 1440) return { label: 'MP4 1440p',       quality: '1440p' };
  if (height >= 1080) return { label: 'MP4 1080p (HD)',  quality: '1080p' };
  if (height >= 720)  return { label: 'MP4 720p',        quality: '720p' };
  if (height >= 480)  return { label: 'MP4 480p',        quality: '480p' };
  if (height >= 360)  return { label: 'MP4 360p',         quality: '360p' };
  return { label: `MP4 ${height}p`, quality: `${height}p` };
}

function formatSize(format: YtFormat): number {
  return format.filesize ?? format.filesize_approx ?? 0;
}

function bestAudioFormat(info: YtInfo): YtFormat | undefined {
  return (info.formats ?? [])
    .filter(f => f.url && (f.vcodec ?? 'none') === 'none' && (f.acodec ?? 'none') !== 'none')
    .sort((a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0))[0];
}

function buildVideoFormats(
  info: YtInfo,
  pageUrl: string,
  title: string,
): DownloadFormat[] {
  const all = info.formats ?? [];
  const video = all.filter(f => f.url && f.height && (f.vcodec ?? 'none') !== 'none');

  if (!video.length) {
    // TikTok photo posts and image-only pins can still expose image entries.
    const images = all.filter(f => f.url && /^(jpg|jpeg|png|webp|gif)$/i.test(f.ext ?? ''));
    return images.slice(0, 35).map((f, index) => ({
      label: `Photo ${index + 1} (${(f.ext ?? 'jpg').toUpperCase()})`,
      quality: f.width && f.height ? `${f.width}×${f.height}` : 'original',
      extension: f.ext ?? 'jpg',
      url: proxyUrl(f.url!, `${sanitize(title)}-${index + 1}.${f.ext ?? 'jpg'}`),
      hasAudio: false,
      hasVideo: false,
    }));
  }

  // One entry per real quality tier. Vertical video reports its long side as
  // height (e.g. 720×1280), so label by the short side while keeping the raw
  // height for the format selector.
  const byQuality = new Map<number, { format: YtFormat; rawHeight: number }>();
  const score = (f: YtFormat) => ((f.acodec && f.acodec !== 'none') ? 1e12 : 0) + (f.tbr ?? 0);
  for (const format of video) {
    const rawHeight = format.height!;
    const shortSide = Math.min(format.width ?? rawHeight, rawHeight);
    const qualityHeight = shortSide >= 144 ? shortSide : rawHeight;
    const current = byQuality.get(qualityHeight);
    if (!current || score(format) > score(current.format)) {
      byQuality.set(qualityHeight, { format, rawHeight });
    }
  }

  const tiers = [...byQuality.entries()]
    .filter(([qualityHeight]) => qualityHeight >= 144 && qualityHeight <= 4320)
    .sort((a, b) => b[0] - a[0])
    .slice(0, MAX_TIERS);

  const audioSize = formatSize(bestAudioFormat(info) ?? {});
  const formats: DownloadFormat[] = [];

  for (const [qualityHeight, { format, rawHeight }] of tiers) {
    const muxed = (format.acodec ?? 'none') !== 'none';
    const { label, quality } = labelForHeight(qualityHeight);
    const filename = `${sanitize(title)}-${qualityHeight}p.mp4`;
    const size = formatBytes(formatSize(format) + (muxed ? 0 : audioSize));

    let url: string;
    if (isTiktokHost(pageUrl)) {
      url = ttStreamUrl(pageUrl, rawHeight, filename);
    } else if (isYouTubeHost(pageUrl)) {
      // yt-dlp downloads and muxes in the same network context, avoiding
      // expiring/IP-bound googlevideo URLs.
      url = mergeDownloadUrl(pageUrl, rawHeight, filename);
    } else if (muxed) {
      url = proxyUrl(format.url!, filename);
    } else {
      url = mergeDownloadUrl(pageUrl, rawHeight, filename);
    }

    formats.push({
      label,
      quality,
      extension: 'mp4',
      size,
      url,
      hasAudio: true,
      hasVideo: true,
    });
  }

  return formats;
}

function buildAudioFormats(info: YtInfo, pageUrl: string, title: string): DownloadFormat[] {
  const filename = `${sanitize(title)}.mp3`;

  if (isTiktokHost(pageUrl)) {
    return [{
      label: 'MP3 192kbps',
      quality: '192kbps',
      extension: 'mp3',
      url: ttStreamUrl(pageUrl, 4320, filename, { extractAudio: true }),
      hasAudio: true,
      hasVideo: false,
    }];
  }

  const best = bestAudioFormat(info);
  const formats: DownloadFormat[] = [
    {
      label: 'MP3 320kbps',
      quality: '320kbps',
      extension: 'mp3',
      url: audioDownloadUrl(pageUrl, 320, filename),
      hasAudio: true,
      hasVideo: false,
    },
    {
      label: 'MP3 192kbps',
      quality: '192kbps',
      extension: 'mp3',
      url: audioDownloadUrl(pageUrl, 192, filename),
      hasAudio: true,
      hasVideo: false,
    },
  ];

  if (best?.url) {
    formats.push({
      label: 'M4A (source audio)',
      quality: 'source',
      extension: 'm4a',
      size: formatBytes(formatSize(best)),
      url: proxyUrl(best.url, `${sanitize(title)}.m4a`),
      hasAudio: true,
      hasVideo: false,
    });
  }

  return formats;
}

/* ─── main resolver ─────────────────────────────────────────── */

export async function resolveWithYtdlp(
  url: string,
  toolSlug: string,
  options: YtdlpOptions = {},
): Promise<DownloadResult> {
  // Thumbnail-only: no yt-dlp needed, direct CDN
  if (options.thumbnailOnly) return resolveThumbnail(url);

  const available = await isBinaryAvailable();
  if (!available) {
    if (options.metadataOnly) {
      return {
        ok: false,
        error: 'Preview information is unavailable because the media service is not configured.',
        code: 'PROVIDER_UNAVAILABLE',
      };
    }
    return resolveViaRemoteApi(url, toolSlug);
  }

  try {
    const info = await getInfo(url);
    const meta = infoMeta(info, toolSlug);

    if (options.metadataOnly) {
      return { ok: true, ...meta, formats: [] };
    }

    if (options.thumbnailViaMetadata) {
      if (!meta.thumbnail) {
        return { ok: false, error: 'No thumbnail was found for this URL.', code: 'MEDIA_NOT_FOUND' };
      }
      return {
        ok: true,
        ...meta,
        formats: [{
          label: 'Thumbnail JPG',
          quality: 'original',
          extension: 'jpg',
          url: proxyUrl(meta.thumbnail, `${sanitize(meta.title)}.jpg`),
          hasAudio: false,
          hasVideo: false,
        }],
      };
    }

    const formats = options.audioOnly
      ? buildAudioFormats(info, url, meta.title)
      : buildVideoFormats(info, url, meta.title);

    if (options.playlist) {
      return {
        ok: false,
        error: 'Playlist processing is not implemented yet. Use a direct video link.',
        code: 'FORMAT_UNAVAILABLE',
      };
    }

    if (toolSlug === 'x-gif-downloader') {
      const smallest = (info.formats ?? [])
        .filter(f => f.url && f.height && (f.vcodec ?? 'none') !== 'none')
        .sort((a, b) => (a.height ?? 0) - (b.height ?? 0))[0];
      if (smallest?.url) {
        formats.push({
          label: 'Animated GIF',
          quality: 'gif',
          extension: 'gif',
          url: `/api/tools/video/url-to-gif?${new URLSearchParams({
            url: smallest.url,
            filename: `${sanitize(meta.title)}.gif`,
          })}`,
          hasAudio: false,
          hasVideo: false,
        });
      }
    }

    if (!formats.length) {
      return {
        ok: false,
        error: 'No downloadable formats were found for this link. The post may be a photo, private, or unsupported.',
        code: 'FORMAT_UNAVAILABLE',
      };
    }

    return { ok: true, ...meta, formats };
  } catch (err) {
    const failure = failureFromError(err);
    // A remote worker can still resolve when this server's IP is blocked.
    if (failure.code === 'PROVIDER_RATE_LIMITED' && process.env.DOWNLOADER_API_URL) {
      const remote = await resolveViaRemoteApi(url, toolSlug);
      if (remote.ok) return remote;
    }
    return failure;
  }
}

function failureFromError(err: unknown): { ok: false; error: string; code: string } {
  // Node's execFile rejection .message is "Command failed: <full binary
  // path and args>\n<stderr>", which leaks server paths. Prefer stderr.
  const msg = execErrorMessage(err);

  if (msg.includes('Sign in to confirm') || msg.includes('not a bot'))
    return {
      ok: false,
      error: 'The platform is temporarily blocking automated requests from this server. Please try again in a few minutes.',
      code: 'PROVIDER_RATE_LIMITED',
    };
  if (msg.includes('Private video') || msg.includes('private'))
    return { ok: false, error: 'This content is private and cannot be downloaded.', code: 'MEDIA_PRIVATE' };
  if (msg.includes('Requested format is not available'))
    return { ok: false, error: 'The selected quality is not available for this video.', code: 'FORMAT_UNAVAILABLE' };
  if (msg.includes('not available') || msg.includes('removed'))
    return { ok: false, error: 'This media is no longer available.', code: 'MEDIA_NOT_FOUND' };
  if (msg.includes('geo') || msg.includes('blocked') || msg.includes('not available in your country'))
    return { ok: false, error: 'This content is not available in the server region.', code: 'MEDIA_NOT_FOUND' };
  if (msg.includes('Unsupported URL'))
    return { ok: false, error: 'This URL is not supported.', code: 'UNSUPPORTED_PLATFORM' };
  if (msg.includes('Unable to extract'))
    return { ok: false, error: 'The platform changed its page structure. Please try again later.', code: 'PROVIDER_UNAVAILABLE' };

  return {
    ok: false,
    error: 'Could not process this URL. The platform may be temporarily unavailable, please try again shortly.',
    code: 'PROVIDER_UNAVAILABLE',
  };
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
    return { ok: false, error: 'Could not extract YouTube video ID from this URL.', code: 'INVALID_URL' };

  const base = `https://img.youtube.com/vi/${videoId}`;
  const variants = [
    { label: 'MaxRes JPG', quality: '1280×720', url: `${base}/maxresdefault.jpg` },
    { label: 'HQ JPG',     quality: '480×360',  url: `${base}/hqdefault.jpg`     },
    { label: 'MQ JPG',     quality: '320×180',  url: `${base}/mqdefault.jpg`     },
    { label: 'SD JPG',     quality: '120×90',   url: `${base}/default.jpg`       },
  ];

  const formats: DownloadFormat[] = [];
  for (const v of variants) {
    if (v.label === 'MaxRes JPG') {
      try {
        const r = await fetch(v.url, { method: 'HEAD', signal: AbortSignal.timeout(5_000) });
        if (!r.ok) continue;
      } catch { continue; }
    }
    formats.push({
      label: v.label,
      quality: v.quality,
      extension: 'jpg',
      // Public YouTube image CDN. The client fetches it without custom
      // headers so the browser does not trigger a blocked CORS preflight.
      url: v.url,
      hasAudio: false,
      hasVideo: false,
    });
  }

  return {
    ok: true,
    title:     `YouTube Thumbnail (${videoId})`,
    thumbnail: formats[0]?.url || `${base}/hqdefault.jpg`,
    platform:  'youtube',
    formats,
  };
}

/* ─── remote API fallback ───────────────────────────────────── */

async function resolveViaRemoteApi(url: string, toolSlug: string): Promise<DownloadResult> {
  const apiUrl = process.env.DOWNLOADER_API_URL;
  if (!apiUrl) {
    return { ok: false, error: 'Downloader service is not configured.', code: 'PROVIDER_UNAVAILABLE' };
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
    if (!res.ok) return { ok: false, error: `Remote downloader responded ${res.status}.`, code: 'PROVIDER_UNAVAILABLE' };
    const data: unknown = await res.json();
    if (!data || typeof data !== 'object' || typeof (data as { ok?: unknown }).ok !== 'boolean') {
      return { ok: false, error: 'The remote downloader returned an invalid response.', code: 'INTERNAL_ERROR' };
    }
    return data as DownloadResult;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Remote downloader failed.', code: 'PROVIDER_UNAVAILABLE' };
  }
}
