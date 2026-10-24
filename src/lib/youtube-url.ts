const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type YouTubeUrlResult =
  | { ok: true; url: string; videoId: string }
  | { ok: false; error: string };

export function normalizeYouTubeVideoUrl(input: string): YouTubeUrlResult {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { ok: false, error: 'Enter a complete HTTPS YouTube link.' };
  }

  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
    return { ok: false, error: 'Only HTTPS YouTube links are supported.' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  let videoId = '';
  if (host === 'youtu.be') {
    videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v') || '';
    else {
      const match = parsed.pathname.match(/^\/(?:shorts|embed)\/([^/?#]+)/);
      videoId = match?.[1] || '';
    }
    if (parsed.pathname === '/playlist' && !videoId) {
      return { ok: false, error: 'Playlist-only links are not supported here. Paste a link to one YouTube video.' };
    }
  } else {
    return { ok: false, error: 'Paste a YouTube video, Shorts, or youtu.be link.' };
  }

  if (!VIDEO_ID.test(videoId)) {
    return { ok: false, error: 'That link does not contain a valid YouTube video ID.' };
  }

  return { ok: true, videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
}
