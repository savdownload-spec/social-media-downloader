import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVercelGeo } from '@/lib/geo/vercel-geo';
import { resolveDayNight } from '@/lib/theme/resolve-auto-theme';
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from '@/lib/affiliates-constants';

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

  // Affiliate referral attribution: first-touch — a visitor's first `?ref=`
  // wins and is kept for 30 days, so a later plain visit (no ref param)
  // doesn't erase who referred them. The code itself isn't validated here
  // (middleware can't reach Prisma on the edge runtime); an unknown code
  // simply credits nothing when a signup later checks it.
  const rawRef = request.nextUrl.searchParams.get('ref');
  const refCode = rawRef && /^[a-z0-9-]{1,40}$/i.test(rawRef) ? rawRef : null;
  if (refCode && !request.cookies.has(REFERRAL_COOKIE)) {
    response.cookies.set(REFERRAL_COOKIE, refCode, {
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      sameSite: 'lax',
      path: '/',
    });
  }

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
