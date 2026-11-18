'use client';

import Script from 'next/script';

interface GoogleTagManagerProps {
  id: string;
}

/**
 * Loads Google Tag Manager after the page becomes interactive so it does not
 * block the critical rendering path (FCP/LCP). The dataLayer initialisation
 * is inlined in the first Script tag so it is always available before the
 * GTM bundle executes.
 *
 * The container's GA4 Google tag only initialises after the legacy
 * `gtag('js', new Date())` signal: when GTM is injected dynamically after
 * window load (Next.js afterInteractive), omitting it leaves the container
 * running with gtm.dom/gtm.load but no GA4 hits. Verified against the live
 * container GTM-5SX8RKCS.
 */
export function GoogleTagManager({ id }: GoogleTagManagerProps) {
  return (
    <>
      <Script
        id="gtm-datalayer-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());`,
        }}
      />
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtm.js?id=${id}`}
      />
    </>
  );
}
