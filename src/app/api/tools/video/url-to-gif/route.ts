/**
 * GET /api/tools/video/url-to-gif?url=<source>&filename=<name>
 *
 * On-demand MP4→GIF conversion for a resolved CDN stream URL. Used by
 * X GIF Downloader's "real GIF" format option: yt-dlp resolves the source
 * MP4 stream URL, and this route lazily converts it to an actual animated
 * GIF only when the user clicks that specific download option.
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { urlToGif } from '@/lib/videoService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`vidurl:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const sourceUrl = searchParams.get('url');
  const filename  = (searchParams.get('filename') || 'video').replace(/[/\\?%*:|"<>]/g, '-');

  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
    return NextResponse.json({ error: 'Invalid or missing source URL.' }, { status: 400 });
  }

  const result = await urlToGif(sourceUrl, { fps: 12, width: 480 });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const base = filename.replace(/\.[^.]+$/, '');
  return new NextResponse(Buffer.from(result.buffer), {
    status: 200,
    headers: {
      'Content-Type':        result.mimeType,
      'Content-Disposition': `attachment; filename="${base}.gif"`,
      'Cache-Control':       'no-store',
    },
  });
}
