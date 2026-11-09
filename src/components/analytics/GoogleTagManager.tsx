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
 */
export function GoogleTagManager({ id }: GoogleTagManagerProps) {
  return (
    <>
      <Script
        id="gtm-datalayer-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];`,
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
