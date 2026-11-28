'use client';

import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { GoogleTagManager } from './GoogleTagManager';

export function AnalyticsScripts({ gtmId }: { gtmId: string }) {
  const { consent } = useCookieConsent();
  const analyticsAllowed = consent?.analytics === true;

  return (
    <>
      <GoogleTagManager id={gtmId} />
      {analyticsAllowed && (
        <>
          <Script
            id="ahrefs-analytics"
            src="https://analytics.ahrefs.com/analytics.js"
            data-key="Y4hjtZYrkSQE4nUigWpKbg"
            strategy="afterInteractive"
          />
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </>
  );
}
