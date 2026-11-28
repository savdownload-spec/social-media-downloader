'use client';

import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from 'react';
import {
  CONSENT_ATTR,
  clearAnalyticsCookies,
  readStoredConsent,
  writeConsentCookie,
  type ConsentPreferences,
} from '@/lib/cookie-consent';

type CookieConsentContextValue = {
  /** null until the saved choice is read on mount, which also means "no choice yet". */
  consent: ConsentPreferences | null;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  savePreferences: (next: ConsentPreferences) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) throw new Error('useCookieConsent must be used inside CookieConsentProvider');
  return context;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  // Read on mount, not during render: the static HTML cannot see the cookie,
  // so it always ships the banner and the blocking head script hides it before
  // first paint when a saved choice exists.
  useEffect(() => {
    setConsent(readStoredConsent());
  }, []);

  const savePreferences = useCallback(
    (next: ConsentPreferences) => {
      const trackingReduced =
        consent !== null &&
        ((consent.analytics && !next.analytics) || (consent.marketing && !next.marketing));
      writeConsentCookie(next);
      setSettingsOpen(false);
      setConsent(next);
      document.documentElement.setAttribute(CONSENT_ATTR, 'set');
      // Tag scripts already on the page cannot be unloaded in place; a reload
      // drops them and the head script then applies the reduced choice.
      if (trackingReduced) {
        clearAnalyticsCookies();
        window.location.reload();
      }
    },
    [consent],
  );

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        settingsOpen,
        openSettings,
        closeSettings,
        savePreferences,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}
