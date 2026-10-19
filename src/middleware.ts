import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVercelGeo } from '@/lib/geo/vercel-geo';
import { resolveDayNight } from '@/lib/theme/resolve-auto-theme';
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from '@/lib/affiliates-constants';
import { getToken } from 'next-auth/jwt';
import { isMaintenanceBypassPath } from '@/lib/maintenance';

// The site used to serve locale-prefixed URLs (/de/tools/..., /es/blog/...)
// through the retired locale-routing system. Real translation is now handled entirely
// client-side by the Google Translate widget (src/lib/translation-manager.ts),
// so those prefixes no longer correspond to real routes — but old indexed
// or bookmarked links to them still exist, so redirect rather than 404.
const LEGACY_LOCALE_PREFIXES = ['en', 'es', 'fr', 'de', 'pt', 'hi', 'ar', 'ja', 'ko', 'zh', 'tr', 'ru'];

const AUTO_THEME_COOKIE = 'sd_auto_theme';
// 12h: long enough to avoid recomputing on every request, short enough that
// a long-open tab that crosses the day/night boundary mid-session picks up
// a fresh value on its next navigation or reload.
const AUTO_THEME_MAX_AGE = 60 * 60 * 12;

async function maintenanceEnabled(request: NextRequest) {
  try {
    const response = await fetch(new URL('/api/maintenance/status', request.url), {
      cache: 'no-store',
      headers: { 'x-savdown-maintenance-check': '1' },
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { enabled?: boolean };
    return data.enabled === true;
  } catch {
    // Fail open when configuration cannot be read. An infrastructure issue
    // should not accidentally put every public route into maintenance mode.
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first, ...rest] = pathname.split('/');

  if (LEGACY_LOCALE_PREFIXES.includes(first)) {
    const url = request.nextUrl.clone();
    url.pathname = '/' + rest.join('/');
    return NextResponse.redirect(url, 301);
  }

  let response = NextResponse.next();
  let hasSessionToken = false;

  if (!isMaintenanceBypassPath(pathname)) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    hasSessionToken = Boolean(token);
    const isAdmin = token?.role === 'ADMIN';

    if (!isAdmin && await maintenanceEnabled(request)) {
      const url = request.nextUrl.clone();
      url.pathname = '/maintenance';
      url.search = '';
      response = NextResponse.rewrite(url, {
        status: 503,
        headers: {
          'Retry-After': '3600',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
          'Cache-Control': 'private, no-store, max-age=0',
        },
      });
    }
  }

  // Affiliate referral attribution: first-touch — a visitor's first `?ref=`
  // wins and is kept for 30 days, so a later plain visit (no ref param)
  // doesn't erase who referred them. The code itself isn't validated here
  // (middleware can't reach Prisma on the edge runtime); an unknown code
  // simply credits nothing when a signup later checks it.
  const rawRef = request.nextUrl.searchParams.get('ref');
  const refCode = rawRef && /^[a-z0-9-]{1,40}$/i.test(rawRef) ? rawRef : null;
  if (
    refCode && pathname === '/' && !hasSessionToken &&
    !response.headers.has('x-middleware-rewrite')
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('google', '1');
    loginUrl.searchParams.set('callbackUrl', '/workspace');
    response = NextResponse.redirect(loginUrl);
  }
  if (refCode && !request.cookies.has(REFERRAL_COOKIE)) {
    response.cookies.set(REFERRAL_COOKIE, refCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      sameSite: 'lax',
      path: '/',
    });
  }
  if (hasSessionToken && request.cookies.has(REFERRAL_COOKIE)) {
    response.cookies.delete(REFERRAL_COOKIE);
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
