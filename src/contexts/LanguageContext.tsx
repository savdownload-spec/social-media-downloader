'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { languages } from '@/config/languages';
import { loadGoogleTranslateScript, translatePage } from '@/lib/translation-manager';

type Language = {
  code: string;
  label: string;
  flag: string;
};

type LanguageContextType = {
  language: Language;
  setLanguage: (code: string) => void;
  isTranslating: boolean;
  supportedLanguages: Language[];
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const GOOGTRANS_COOKIE = 'googtrans';

/**
 * Removes the googtrans cookie across every scope Google's widget might have
 * written it to (path-only, host, and registrable domain). This is what
 * guarantees a fresh load starts in English: if a previous session left
 * `googtrans=/en/hi`, the widget would silently auto-translate on load unless
 * the cookie is gone before it initializes.
 */
function clearGoogtransCookie() {
  if (typeof document === 'undefined') return;
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const host = window.location.hostname;
  const parts = host.split('.');
  const domains = ['', host, `.${host}`];
  if (parts.length > 2) domains.push(`.${parts.slice(-2).join('.')}`);
  for (const d of domains) {
    document.cookie = `${GOOGTRANS_COOKIE}=; path=/; ${expired}${d ? `; domain=${d}` : ''}`;
  }
}

/**
 * Points Google's widget at a language for the CURRENT session only. English
 * clears the cookie; any other language sets a SESSION cookie (no max-age) so
 * it can never outlive the tab — and it is cleared on the next load anyway
 * (see the reset effect). English is always the default on a fresh load.
 */
function applyGoogtransCookie(code: string) {
  if (typeof document === 'undefined') return;
  if (code === 'en') {
    clearGoogtransCookie();
    return;
  }
  document.cookie = `${GOOGTRANS_COOKIE}=/en/${code}; path=/`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [isTranslating, setIsTranslating] = useState(false);
  // English is ALWAYS the initial language — on the server render, on the
  // client's first hydration pass, and on every fresh page load. The user's
  // choice is deliberately NOT restored from storage here (see the reset
  // effect for why): it must not carry across reloads or new sessions.
  const [language, setLanguageState] = useState<Language>(languages[0]);

  const setLanguage = useCallback(
    async (code: string) => {
      if (code === language.code) return;
      if (!languages.some((l) => l.code === code)) return;

      const targetLang = languages.find((l) => l.code === code)!;
      setLanguageState(targetLang);
      applyGoogtransCookie(code);

      // Purely a client-side visual swap via the preloaded Google Translate
      // widget — no navigation, since URLs carry no locale segment.
      setIsTranslating(true);
      loadGoogleTranslateScript()
        .then(() => translatePage(code))
        .finally(() => setIsTranslating(false));
    },
    [language.code],
  );

  // Force an English baseline on every fresh load. This provider lives in the
  // root layout and does NOT remount on client-side navigation, so a language
  // the user picks stays active while they browse — but a reload, a reopened
  // tab, or a new session remounts it and lands back on English. The cookie is
  // cleared here BEFORE the translate widget is ever constructed (below), so a
  // stale cookie from a previous session can never auto-translate the page.
  //
  // Intentionally NOT reading localStorage/cookies/navigator.language to pick a
  // starting language: English is the default unless the user actively chooses
  // otherwise during this session.
  useEffect(() => {
    clearGoogtransCookie();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preload the widget and drive it to the current language (English on load,
  // near-instant since English just means "no translation"). Preloading here
  // means a later language pick applies quickly rather than waiting on Google's
  // slow async bootstrap.
  useEffect(() => {
    loadGoogleTranslateScript().then(() => translatePage(language.code));
  }, [language.code]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    isTranslating,
    supportedLanguages: languages,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
