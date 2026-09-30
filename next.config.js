/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    // Restrict to known safe hosts for Next.js image optimization.
    // A wildcard hostname lets any URL be proxied through /api/image/,
    // which is an SSRF vector and can be abused to exhaust bandwidth.
    // Add new hostnames here when legitimate sources are added.
    remotePatterns: [
      // Vercel Blob (PDF uploads, user assets)
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '*.vercel-storage.com' },
      // NextAuth / OAuth provider avatars
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },       // Google
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },   // GitHub
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },    // Facebook
      { protocol: 'https', hostname: 'pbs.twimg.com' },                   // Twitter/X
      // SavDown CDN / static
      { protocol: 'https', hostname: 'savdown.com' },
      { protocol: 'https', hostname: '*.savdown.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      // Public read-only API: safe to cache at the CDN edge for 60 s,
      // serve stale for up to 5 min while revalidating in background.
      // These endpoints have no user-specific data and change infrequently.
      {
        source: '/api/reviews',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
          { key: 'Vary', value: 'Accept' },
        ],
      },
      {
        source: '/api/me/plan',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    // pdfkit reads its bundled AFM font metrics off disk at runtime via a
    // computed path (data/Helvetica.afm etc.) — webpack bundling the
    // package breaks that resolution, so it must run un-bundled from
    // node_modules like it would under plain Node.
    serverComponentsExternalPackages: ['pdfkit'],
    // The bundled yt-dlp Linux binary (bin/) and ffmpeg-static's downloaded
    // binary aren't detected by Next.js's default file tracing (they're
    // read via a runtime-computed path, not a static import), so Vercel's
    // build would silently omit them from the serverless function bundle
    // without this — every downloader/video route would fail in
    // production despite working locally.
    outputFileTracingIncludes: {
      '/api/**/*': ['./bin/**/*', './node_modules/ffmpeg-static/**/*'],
    },
  },
};

module.exports = withNextIntl(nextConfig);
