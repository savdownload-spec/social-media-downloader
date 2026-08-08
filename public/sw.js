/**
 * SavDown service worker — deliberately conservative.
 *
 * Goals: make the app installable and resilient to flaky connections,
 * without ever interfering with the tool pages themselves (file processing,
 * downloads, proxied media). We only cache a small app shell and static
 * assets; everything under /api/ and every non-GET request always goes
 * straight to the network.
 */

const SHELL_CACHE = 'savdown-shell-v1';
const RUNTIME_CACHE = 'savdown-runtime-v1';
const CURRENT_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

const OFFLINE_URL = '/offline.html';

const SHELL_ASSETS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-black.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !CURRENT_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never intercept non-GET requests (form posts, tool processing, etc.).
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Always hit the network for API routes and cross-origin requests (proxied
  // media, third-party assets) — never cache these.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Page navigations: network-first, falling back to a cached copy, then the
  // offline page, so a flaky connection never shows a browser error screen.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Static assets: cache-first, then fall back to network and populate the
  // runtime cache for next time.
  if (/\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached
          || fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
