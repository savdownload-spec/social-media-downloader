/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
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
