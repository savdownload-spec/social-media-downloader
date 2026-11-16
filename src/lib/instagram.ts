/**
 * Instagram profile-picture resolver.
 *
 * yt-dlp's metadata thumbnail for a profile URL is not guaranteed to be the
 * avatar, and Instagram serves an empty shell to plain browser requests from
 * datacenter IPs. Two anonymous sources are tried in order:
 *   1. web_profile_info JSON (HD avatar) when Instagram answers it
 *   2. The crawler-rendered profile page, which embeds the avatar URL
 * The fallback image is 150×150, so the caller labels it with its real size
 * instead of claiming HD.
 */
import type { DownloadResult } from '@/types';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const CRAWLER_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const IG_APP_ID = '936619743392459';

const RESERVED_PATHS = new Set([
  'p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts',
  'direct', 'about', 'developer', 'legal', 'web',
]);

export function instagramUsernameFromUrl(input: string): string | null {
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'instagram.com') return null;
    const first = u.pathname.split('/').filter(Boolean)[0] ?? '';
    if (!first || RESERVED_PATHS.has(first.toLowerCase())) return null;
    return /^[A-Za-z0-9._]{1,30}$/.test(first) ? first : null;
  } catch {
    return null;
  }
}

function decodeEmbedded(value: string): string {
  return value
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');
}

export function parseInstagramAvatarHtml(html: string): { url: string; hd: boolean } | null {
  const hd = html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/);
  if (hd?.[1]) return { url: decodeEmbedded(hd[1]), hd: true };

  const standard = html.match(/"profile_pic_url"\s*:\s*"([^"]+)"/);
  if (standard?.[1]) return { url: decodeEmbedded(standard[1]), hd: false };

  const meta = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]*>/i);
  const content = meta?.[0]?.match(/content=["']([^"']+)["']/i);
  if (content?.[1]) return { url: decodeEmbedded(content[1]), hd: false };

  return null;
}

async function fetchHdAvatar(username: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: { 'x-ig-app-id': IG_APP_ID, 'user-agent': BROWSER_UA, accept: '*/*' },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { user?: { profile_pic_url_hd?: string; profile_pic_url?: string } };
    };
    const url = json.data?.user?.profile_pic_url_hd || json.data?.user?.profile_pic_url;
    return typeof url === 'string' && url.startsWith('https://') ? url : null;
  } catch {
    return null;
  }
}

async function fetchProfilePageAvatar(username: string): Promise<{ url: string; hd: boolean } | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      headers: { 'user-agent': CRAWLER_UA, 'accept-language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return parseInstagramAvatarHtml(await res.text());
  } catch {
    return null;
  }
}

export async function resolveInstagramProfilePicture(url: string): Promise<DownloadResult> {
  const username = instagramUsernameFromUrl(url);
  if (!username) {
    return {
      ok: false,
      error: 'Paste a profile link such as https://www.instagram.com/username/.',
      code: 'INVALID_URL',
    };
  }

  const hdUrl = await fetchHdAvatar(username);
  const avatar = hdUrl
    ? { url: hdUrl, hd: true }
    : await fetchProfilePageAvatar(username);

  if (!avatar) {
    return {
      ok: false,
      error: 'Instagram did not return this profile picture. The profile may be private or removed, or Instagram is temporarily limiting requests. Please try again in a few minutes.',
      code: 'PROVIDER_UNAVAILABLE',
    };
  }

  const filename = `${username}-profile.jpg`;
  return {
    ok: true,
    title: `@${username} on Instagram`,
    thumbnail: avatar.url,
    author: `@${username}`,
    platform: 'instagram',
    formats: [{
      label: avatar.hd ? 'Profile photo' : 'Profile photo (150×150)',
      quality: avatar.hd ? 'HD' : '150x150',
      extension: 'jpg',
      url: `/api/proxy?${new URLSearchParams({ url: avatar.url, filename })}`,
      hasAudio: false,
      hasVideo: false,
    }],
  };
}
