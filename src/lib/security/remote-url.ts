const PLATFORM_HOSTS = [
  'youtube.com', 'youtu.be',
  'tiktok.com',
  'instagram.com',
  'facebook.com', 'fb.watch',
  'pinterest.com', 'pin.it',
  'x.com', 'twitter.com',
] as const;

const X_MEDIA_HOSTS = ['twimg.com'] as const;

function hasAllowedHost(hostname: string, allowed: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function parseRemoteHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

/** URLs that may be handed to yt-dlp/gallery-dl. Keep this list explicit. */
export function isSupportedPlatformUrl(value: string): boolean {
  const url = parseRemoteHttpsUrl(value);
  return !!url && hasAllowedHost(url.hostname, PLATFORM_HOSTS);
}

/** Direct media URLs accepted by the X MP4-to-GIF flow. */
export function isTrustedXMediaUrl(value: string): boolean {
  const url = parseRemoteHttpsUrl(value);
  return !!url && hasAllowedHost(url.hostname, X_MEDIA_HOSTS);
}

