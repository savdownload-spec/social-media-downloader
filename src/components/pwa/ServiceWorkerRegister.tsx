'use client';

import { useEffect } from 'react';

/**
 * Registers the app-shell service worker once the page has finished loading,
 * so it never competes with the initial render for bandwidth. Renders nothing.
 *
 * Production only: a service worker caching navigations alongside Fast
 * Refresh's live-patched bundles is a well-known source of stale-HTML /
 * hydration mismatches in development, so we skip registration entirely
 * outside of production builds.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline support is a progressive enhancement, fail silently */
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
