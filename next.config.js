/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '*.vercel-storage.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
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
  webpack(config, { isServer }) {
    // @imgly/background-removal ships onnxruntime-web .mjs files containing
    // native ESM `import.meta`. Next.js 14 webpack defaults to treating .mjs
    // as CommonJS, causing Terser to fail on import.meta during minification.
    // Marking these files as javascript/esm fixes the build.
    config.module.rules.push({
      test: /ort[-.].*\.m?js$/,
      resolve: { fullySpecified: false },
      type: 'javascript/esm',
    });
    // Server-side: exclude browser-only @imgly/onnxruntime packages so
    // webpack never pulls their WASM binaries into the SSR bundle.
    if (isServer) {
      const orig = Array.isArray(config.externals)
        ? config.externals
        : config.externals ? [config.externals] : [];
      config.externals = [
        ...orig,
        ({ request }, callback) => {
          if (
            request &&
            (request.startsWith('@imgly/background-removal') ||
              request.startsWith('onnxruntime-web'))
          ) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    // Packages that must run un-bundled from node_modules at runtime:
    // - pdfkit: reads AFM font files via computed path; bundling breaks it
    // - ffmpeg-static: dynamic platform/arch detection; bundling breaks path
    // - mammoth: dynamic file-system paths for .docx parsing
    // - @imgly/background-removal + onnxruntime-web: browser-only ESM packages
    serverComponentsExternalPackages: [
      'pdfkit',
      'ffmpeg-static',
      'mammoth',
      '@imgly/background-removal',
      'onnxruntime-web',
      'onnxruntime-node',
      'undici',
    ],
    // Only the 5 routes that invoke yt-dlp or ffmpeg receive those binaries.
    // The previous wildcard '/api/**/*' forced ~117 MB into every route
    // (~9.96 GB Function Storage). Scoped to 5 routes: ~585 MB.
    outputFileTracingIncludes: {
      '/api/download': [
        './bin/**/*',
      ],
      '/api/download/merge': [
        './bin/**/*',
        './node_modules/ffmpeg-static/**/*',
      ],
      '/api/tools/tiktok/stream': [
        './bin/**/*',
        './node_modules/ffmpeg-static/**/*',
      ],
      '/api/tools/video': [
        './node_modules/ffmpeg-static/**/*',
      ],
      '/api/tools/video/url-to-gif': [
        './node_modules/ffmpeg-static/**/*',
      ],
    },
  },
};

module.exports = withNextIntl(nextConfig);
