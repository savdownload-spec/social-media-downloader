import createMiddleware from 'next-intl/middleware';
import { locales } from './config/locales';

export default createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

export const config = {
  matcher: [
    // Match the root and all locale prefixes
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
