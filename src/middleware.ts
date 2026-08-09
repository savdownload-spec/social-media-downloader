import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// The site used to serve locale-prefixed URLs (/de/tools/..., /es/blog/...)
// via next-intl routing. Real translation is now handled entirely
// client-side by the Google Translate widget (src/lib/translation-manager.ts),
// so those prefixes no longer correspond to real routes — but old indexed
// or bookmarked links to them still exist, so redirect rather than 404.
const LEGACY_LOCALE_PREFIXES = ['en', 'es', 'fr', 'de', 'pt', 'hi', 'ar', 'ja', 'ko', 'zh', 'tr', 'ru'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first, ...rest] = pathname.split('/');

  if (LEGACY_LOCALE_PREFIXES.includes(first)) {
    const url = request.nextUrl.clone();
    url.pathname = '/' + rest.join('/');
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
