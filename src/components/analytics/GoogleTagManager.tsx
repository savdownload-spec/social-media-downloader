'use client';

import { useEffect } from 'react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { shouldLoadGtm, toConsentSignals } from '@/lib/cookie-consent';

/**
 * Injects the GTM container only after the visitor allows analytics or
 * marketing. Consent Mode defaults and gtag() are already defined by the
 * blocking head script, so the consent update pushed here reaches the GA4
 * tag before the container executes. `gtag('js')` is issued there too: the
 * container's GA4 Google tag only initialises after that signal when GTM is
 * injected after window load.
 */
export function GoogleTagManager({ id }: { id: string }) {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (!consent || !shouldLoadGtm(consent)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('consent', 'update', toConsentSignals(consent));

    const src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }, [consent, id]);

  return null;
}
