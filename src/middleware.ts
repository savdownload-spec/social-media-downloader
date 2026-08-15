import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVercelGeo } from '@/lib/geo/vercel-geo';
import { resolveDayNight } from '@/lib/theme/resolve-auto-theme';

// The site used to serve locale-prefixed URLs (/de/tools/..., /es/blog/...)
// via next-intl routing. Real translation is now handled entirely
// client-side by the Google Translate widget (src/lib/translation-manager.ts),
// so those prefixes no longer correspond to real routes — but old indexed
// or bookmarked links to them still exist, so redirect rather than 404.
const LEGACY_LOCALE_PREFIXES = ['en', 'es', 'fr', 'de', 'pt', 'hi', 'ar', 'ja', 'ko', 'zh', 'tr', 'ru'];

const AUTO_THEME_COOKIE = 'sd_auto_theme';
// 12h: long enough to avoid recomputing on every request, short enough that
// a long-open tab that crosses the day/night boundary mid-session picks up
// a fresh value on its next navigation or reload.
const AUTO_THEME_MAX_AGE = 60 * 60 * 12;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first, ...rest] = pathname.split('/');

  if (LEGACY_LOCALE_PREFIXES.includes(first)) {
    const url = request.nextUrl.clone();
    url.pathname = '/' + rest.join('/');
    return NextResponse.redirect(url, 301);
  }

  const response = NextResponse.next();

  // Regional day/night for Auto theme mode, resolved from Vercel's free
  // edge geo headers only — no external API call, no latency added to
  // navigation. Read by the blocking init script in <head> (see
  // src/lib/theme/theme-init-script.ts) before first paint. Absent on
  // non-Vercel hosts (local dev/self-host), where the init script falls
  // back to the browser's own timezone instead.
  if (!request.cookies.has(AUTO_THEME_COOKIE)) {
    const geo = getVercelGeo(request.headers);
    if (geo?.timezone) {
      response.cookies.set(AUTO_THEME_COOKIE, resolveDayNight(geo.timezone), {
        maxAge: AUTO_THEME_MAX_AGE,
        sameSite: 'lax',
        path: '/',
      });
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
