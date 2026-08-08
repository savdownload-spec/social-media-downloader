/**
 * yt-dlp service layer.
 *
 * Uses yt-dlp's --print / --format selectors to get exactly the streams we
 * want without downloading the full multi-megabyte --dump-json blob.
 *
 * Architecture: API Route → ytdlp.ts → yt-dlp binary (or DOWNLOADER_API_URL)
 */
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import type { DownloadResult, DownloadFormat } from '@/types';

const execFileAsync = promisify(execFile);

const YTDLP_BIN     = process.env.YTDLP_BIN     || 'yt-dlp';
const YTDLP_TIMEOUT = parseInt(process.env.YTDLP_TIMEOUT_MS || '45000', 10);
const MAX_RETRIES   = 2;

export type YtdlpOptions = {
  audioOnly?:    boolean;
  thumbnailOnly?: boolean;
  thumbnailViaMetadata?: boolean;
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

// TikTok's web app blocks yt-dlp's default HTTP client (fails with "Unable to
// extract universal data for rehydration"). Requires TLS-fingerprint
// impersonation via curl_cffi (free, BSD-licensed) to look like a real
// browser. Scoped to TikTok only — other extractors don't need it.
export function needsImpersonation(url: string): boolean {
  return /tiktok\.com/i.test(url);
}

function proxyUrl(rawUrl: string, filename: string, extra?: { referer?: string; cookie?: string }): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const params: Record<string, string> = { url: rawUrl, filename };
  if (extra?.referer) params.ref = extra.referer;
  if (extra?.cookie) params.cookie = extra.cookie;
  return `${base}/api/proxy?${new URLSearchParams(params)}`;
}

/**
 * Most platforms only serve resolutions above ~360p as separate video-only
 * and audio-only streams — no single CDN URL has both. Point the download
 * link at /api/download/merge, which has yt-dlp mux the matching pair
 * server-side into one real (non-silent) MP4, instead of handing back a
 * raw video-only stream URL.
 */
function mergeDownloadUrl(pageUrl: string, height: number, filename: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return `${base}/api/download/merge?${new URLSearchParams({ url: pageUrl, height: String(height), filename })}`;
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
    ...(needsImpersonation(url) ? ['--impersonate', 'chrome'] : []),
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
async function getFormatUrl(
  url: string,
  formatSelector: string,
): Promise<{ streamUrl: string; filesize: number; height?: number; referer?: string; cookie?: string }> {
  const impersonating = needsImpersonation(url);
  // TikTok's CDN rejects stream requests that don't carry the exact
  // Referer + session cookies yt-dlp used during extraction (separate bot
  // check from the page-extraction challenge). Capture them so the proxy
  // can replay them when actually fetching the file.
  //
  // %(height)s is always requested: a "height<=2160" selector will happily
  // fall back to whatever the video's actual max height is (e.g. 1080p) —
  // the caller needs the real resolved height to dedupe/relabel tiers that
  // all silently landed on the same underlying stream.
  const printTemplate = impersonating
    ? '%(url)s\n---FIELD---\n%(filesize|filesize_approx|0)s\n---FIELD---\n%(height|0)s\n---FIELD---\n%(http_headers.Referer)s\n---FIELD---\n%(cookies)s'
    : '%(url)s\n---FIELD---\n%(filesize|filesize_approx|0)s\n---FIELD---\n%(height|0)s';

  const args = [
    '--no-playlist', '--no-warnings', '--no-call-home',
    '--socket-timeout', '20', '--retries', '1',
    ...(impersonating ? ['--impersonate', 'chrome'] : []),
    '-f', formatSelector,
    '--print', printTemplate,
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
    const height    = parseInt(parts[2]?.trim() || '0', 10) || undefined;
    const referer   = parts[3]?.trim();
    const cookie    = parts[4]?.trim();
    return {
      streamUrl,
      filesize,
      height,
      referer: referer && referer !== 'NA' ? referer : undefined,
      cookie:  cookie  && cookie  !== 'NA' ? cookie  : undefined,
    };
  } catch {
    return { streamUrl: '', filesize: 0 };
  }
}

/* ─── video quality tiers ────────────────────────────────────── */

// Quality tiers used to PROBE which resolutions actually exist for a given
// video (and their real height, for accurate labeling — see labelForHeight).
// These selectors are video-only-aware: most platforms (YouTube especially)
// only serve anything above ~360p as separate video-only DASH streams, with
// no single URL containing both audio and video. The actual download later
// goes through /api/download/merge, which has yt-dlp mux the matching
// video+audio pair server-side — these selectors are only used to discover
// what heights genuinely exist, never to hand back a raw (possibly silent)
// stream URL directly.
export const VIDEO_TIERS: { label: string; quality: string; selector: string }[] = [
  { label: 'MP4 4320p (8K)', quality: '4320p', selector: 'bestvideo[height<=4320][ext=mp4]/bestvideo[height<=4320]' },
  { label: 'MP4 2160p (4K)', quality: '2160p', selector: 'bestvideo[height<=2160][ext=mp4]/bestvideo[height<=2160]' },
  { label: 'MP4 1440p',      quality: '1440p', selector: 'bestvideo[height<=1440][ext=mp4]/bestvideo[height<=1440]' },
  { label: 'MP4 1080p (HD)', quality: '1080p', selector: 'bestvideo[height<=1080][ext=mp4]/bestvideo[height<=1080]' },
  { label: 'MP4 720p',       quality: '720p',  selector: 'bestvideo[height<=720][ext=mp4]/bestvideo[height<=720]'   },
  { label: 'MP4 480p',       quality: '480p',  selector: 'bestvideo[height<=480][ext=mp4]/bestvideo[height<=480]'   },
  { label: 'MP4 360p',       quality: '360p',  selector: 'bestvideo[height<=360][ext=mp4]/bestvideo[height<=360]/best[height<=360][ext=mp4]' },
  { label: 'MP4 240p',       quality: '240p',  selector: 'bestvideo[height<=240][ext=mp4]/bestvideo[height<=240]'   },
  { label: 'MP4 144p',       quality: '144p',  selector: 'bestvideo[height<=144][ext=mp4]/bestvideo[height<=144]'   },
];

// Audio tier for music/podcast downloads
export const AUDIO_TIERS: { label: string; quality: string; ext: string; selector: string }[] = [
  { label: 'M4A 128kbps', quality: '128kbps', ext: 'm4a', selector: 'bestaudio[ext=m4a]/bestaudio' },
  { label: 'WebM Audio',  quality: 'high',    ext: 'webm', selector: 'bestaudio[ext=webm]' },
];

/**
 * Map a yt-dlp-resolved actual height to a display label. A tier selector
 * like "height<=2160" happily falls back to the video's real max height
 * (e.g. 1080p) when nothing higher exists — this maps what yt-dlp actually
 * gave us, not what tier we asked for, so we never label a 1080p stream as
 * "4K".
 */
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

// TikTok audio extraction discards the video track, so resolution doesn't
// matter — use the most permissive selector to avoid failing on videos
// that don't happen to match a height-capped tier.
export const TIKTOK_AUDIO_EXTRACT_SELECTOR = 'best';

/** Every format selector this service ever generates — used by the TikTok
 *  streaming route to reject anything it didn't itself hand out. */
export const KNOWN_SELECTORS = new Set([
  ...VIDEO_TIERS.map(t => t.selector),
  ...AUDIO_TIERS.map(t => t.selector),
  TIKTOK_AUDIO_EXTRACT_SELECTOR,
]);

/**
 * Build a download URL for a TikTok format. TikTok's CDN binds signed
 * stream URLs to the exact curl_cffi session that resolved them — a
 * separate later fetch (even with identical headers/cookies/TLS
 * impersonation) gets a 403. The only reliable fix is to have yt-dlp
 * download the bytes itself, in one shot, and stream them straight through
 * our own API instead of ever exposing a TikTok CDN URL to the browser.
 */
function ttStreamUrl(pageUrl: string, selector: string, filename: string, opts?: { extractAudio?: boolean }): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const params: Record<string, string> = { url: pageUrl, selector, filename };
  if (opts?.extractAudio) params.audio = '1';
  return `${base}/api/tools/tiktok/stream?${new URLSearchParams(params)}`;
}

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

    // Thumbnail via metadata: platform has no guessable CDN pattern
    if (options.thumbnailViaMetadata) return resolveThumbnailViaMetadata(url);

    // Step 1: get metadata (fast, small output)
    const meta = await getMeta(url);
    const title     = meta.title;
    const thumbnail = meta.thumbnail;
    const author    = meta.uploader || undefined;
    const duration  = meta.duration || undefined;
    const platform  = meta.platform || toolSlug;

    const formats: DownloadFormat[] = [];

    if (options.audioOnly && needsImpersonation(url)) {
      // TikTok has no separate audio-only stream — it only serves muxed
      // video+audio MP4. Extract the audio track via FFmpeg from the best
      // muxed stream instead of probing for a bestaudio format that
      // doesn't exist on this platform.
      formats.push({
        label:    'MP3 192kbps',
        quality:  '192kbps',
        extension: 'mp3',
        url:      ttStreamUrl(url, TIKTOK_AUDIO_EXTRACT_SELECTOR, `${sanitize(title)}.mp3`, { extractAudio: true }),
        hasAudio: true,
        hasVideo: false,
      });
    } else if (options.audioOnly) {
      // Audio-only mode: fetch best audio streams
      for (const tier of AUDIO_TIERS) {
        const { streamUrl, filesize, referer, cookie } = await getFormatUrl(url, tier.selector);
        if (!streamUrl || streamUrl === 'NA') continue;
        formats.push({
          label:    tier.label,
          quality:  tier.quality,
          extension: tier.ext,
          size:     formatBytes(filesize),
          url:      proxyUrl(streamUrl, `${sanitize(title)}.${tier.ext}`, { referer, cookie }),
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

      let smallestRawStreamUrl = '';
      // A "height<=2160" selector silently falls back to the video's real
      // max height (e.g. 1080p) when nothing higher exists — without this,
      // every unavailable higher tier would re-list that same stream
      // mislabeled as 4K/1440p. Dedupe on the *displayed* quality bucket
      // (not the raw height) since two slightly different raw heights
      // (e.g. 480 and 576) can still land in the same "480p" bucket.
      const seenQuality = new Set<string>();
      for (let i = 0; i < VIDEO_TIERS.length; i++) {
        const tier   = VIDEO_TIERS[i]!;
        const result = tierResults[i];
        if (result?.status !== 'fulfilled') continue;
        const { streamUrl, filesize, height } = result.value;
        if (!streamUrl || streamUrl === 'NA') continue;

        const { label, quality } = height ? labelForHeight(height) : tier;
        if (seenQuality.has(quality)) continue;
        seenQuality.add(quality);

        // Track the raw (unproxied) URL of the smallest resolved tier — used
        // below to feed a fast GIF conversion for x-gif-downloader.
        smallestRawStreamUrl = streamUrl;

        // TikTok's "bestvideo" formats already have audio embedded (TikTok
        // doesn't split video/audio into separate DASH tracks the way
        // YouTube does), so its own stream route can serve them directly.
        // Everywhere else, height above ~360p is very likely video-only —
        // route through the merge endpoint so the download actually has sound.
        const mergeHeight = height || parseInt(quality, 10) || 1080;

        formats.push({
          label,
          quality,
          extension: 'mp4',
          size:     formatBytes(filesize),
          url:      needsImpersonation(url)
            ? ttStreamUrl(url, tier.selector, `${sanitize(title)}.mp4`)
            : mergeDownloadUrl(url, mergeHeight, `${sanitize(title)}.mp4`),
          hasAudio: true,
          hasVideo: true,
        });
      }

      // X GIF Downloader: X stores "GIFs" as silent MP4s. In addition to the
      // MP4 formats above, offer a real animated .gif produced on demand by
      // converting the smallest resolved stream through FFmpeg.
      if (toolSlug === 'x-gif-downloader' && smallestRawStreamUrl) {
        formats.push({
          label:    'Animated GIF',
          quality:  'gif',
          extension: 'gif',
          url:      `/api/tools/video/url-to-gif?${new URLSearchParams({
            url: smallestRawStreamUrl,
            filename: `${sanitize(title)}.gif`,
          })}`,
          hasAudio: false,
          hasVideo: false,
        });
      }

      // Note: no bonus audio-only track here by design — a video downloader
      // should only offer video files. Audio extraction is a separate,
      // dedicated tool (youtube-to-mp3, tiktok-to-mp3, etc.).
    }

    if (!formats.length) {
      return { ok: false, error: 'No downloadable formats found for this URL.' };
    }

    return { ok: true, title, thumbnail, author, duration, platform, formats };

  } catch (err) {
    // Node's execFile rejection .message is "Command failed: <full binary
    // path and args>\n<stderr>" — that leaks internal server paths/flags to
    // the client. Prefer .stderr (yt-dlp's own clean error line) when present.
    const execErr = err as (Error & { stderr?: string }) | undefined;
    const msg = execErr?.stderr || (err instanceof Error ? err.message : String(err));

    if (msg.includes('Sign in to confirm') || msg.includes('not a bot'))
      return { ok: false, error: 'The platform is temporarily rate-limiting automated requests. Please try again in a few minutes.' };
    if (msg.includes('Private video') || msg.includes('private'))
      return { ok: false, error: 'This video is private and cannot be downloaded.' };
    if (msg.includes('not available') || msg.includes('removed'))
      return { ok: false, error: 'This media is no longer available.' };
    if (msg.includes('geo') || msg.includes('blocked') || msg.includes('not available in your country'))
      return { ok: false, error: 'This content is not available in the server region.' };
    if (msg.includes('Unsupported URL'))
      return { ok: false, error: 'This URL is not supported.' };

    // Never leak internal paths or command-line details in the fallback.
    return { ok: false, error: 'Could not process this URL. The platform may be temporarily unavailable — please try again shortly.' };
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

/**
 * Thumbnail resolver for platforms with no predictable CDN URL pattern
 * (unlike YouTube's img.youtube.com). Reuses yt-dlp's own metadata
 * extraction — its `thumbnail` field is already a direct CDN image URL.
 */
async function resolveThumbnailViaMetadata(url: string): Promise<DownloadResult> {
  const meta = await getMeta(url);
  if (!meta.thumbnail) {
    return { ok: false, error: 'No thumbnail was found for this URL.' };
  }
  return {
    ok: true,
    title:     meta.title || 'Thumbnail',
    thumbnail: meta.thumbnail,
    author:    meta.uploader || undefined,
    platform:  meta.platform || 'tiktok',
    formats: [
      {
        label: 'Thumbnail JPG',
        quality: 'original',
        extension: 'jpg',
        url: proxyUrl(meta.thumbnail, `${sanitize(meta.title || 'thumbnail')}.jpg`),
        hasAudio: false,
        hasVideo: false,
      },
    ],
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
