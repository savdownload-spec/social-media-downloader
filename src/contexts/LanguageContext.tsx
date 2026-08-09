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

const STORAGE_KEY = 'savdown-language';
const GOOGTRANS_COOKIE = 'googtrans';

function getStoredLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && languages.some((l) => l.code === stored)) return stored;
  } catch {
    // localStorage unavailable
  }
  return 'en';
}

function setStoredLanguage(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // localStorage unavailable
  }
}

function setGoogtransCookie(sourceLang: string, targetLang: string) {
  if (sourceLang === targetLang) {
    document.cookie = `${GOOGTRANS_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    return;
  }
  const value = `/${sourceLang}/${targetLang}`;
  document.cookie = `${GOOGTRANS_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [isTranslating, setIsTranslating] = useState(false);
  // Always start from English on both the server render and the client's
  // first hydration pass — reading localStorage here would make the
  // client's initial render diverge from the server-rendered HTML (the
  // server has no localStorage), which forces React to discard and fully
  // re-render the tree client-side on every load for a returning
  // non-English user. The stored language is restored a tick later, after
  // mount, in the effect below.
  const [language, setLanguageState] = useState<Language>(languages[0]);

  const setLanguage = useCallback(
    async (code: string) => {
      if (code === language.code) return;
      if (!languages.some((l) => l.code === code)) return;

      const targetLang = languages.find((l) => l.code === code)!;
      setLanguageState(targetLang);
      setStoredLanguage(code);
      setGoogtransCookie('en', code);

      // No navigation here — URLs no longer carry a locale segment, so
      // switching languages is purely a client-side visual swap via the
      // Google Translate widget (already preloaded by the effect below,
      // so this should apply in well under a second).
      if (code !== 'en') {
        setIsTranslating(true);
        loadGoogleTranslateScript()
          .then(() => translatePage(code))
          .finally(() => setIsTranslating(false));
      }
    },
    [language.code]
  );

  // Restore the stored language after mount (see the useState comment above
  // for why this can't happen during the initial synchronous render).
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored !== 'en') {
      const targetLang = languages.find((l) => l.code === stored);
      if (targetLang) {
        setLanguageState(targetLang);
        setGoogtransCookie('en', stored);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preload the widget on every mount (even for English) so it's already
  // initialized by the time a user picks a non-English language — the
  // script + Google's internal async bootstrap is the slow part (can take
  // several seconds), while actually driving an already-ready widget's
  // dropdown is near-instant. Only trigger the visible translation swap
  // when the current language is non-English.
  useEffect(() => {
    loadGoogleTranslateScript().then(() => {
      if (language.code !== 'en') translatePage(language.code);
    });
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
