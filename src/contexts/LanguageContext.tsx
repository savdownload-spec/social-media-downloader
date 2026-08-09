'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { usePathname, useRouter } from '@/navigation';
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

function getGoogtransCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/googtrans=([^;]+)/);
  return match ? match[1] : null;
}

function setGoogtransCookie(sourceLang: string, targetLang: string) {
  if (sourceLang === targetLang) {
    document.cookie = `${GOOGTRANS_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    return;
  }
  const value = `/${sourceLang}/${targetLang}`;
  document.cookie = `${GOOGTRANS_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function getUrlLocale(): string {
  if (typeof window === 'undefined') return 'en';
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length > 0 && languages.some((l) => l.code === segments[0])) {
    return segments[0];
  }
  return 'en';
}

export function LanguageProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isTranslating, setIsTranslating] = useState(false);
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = getStoredLanguage();
    const urlLocale = initialLocale || getUrlLocale();
    // Prefer stored language, fall back to URL locale, then default to English
    const code = stored !== 'en' ? stored : (urlLocale !== 'en' ? urlLocale : 'en');
    return languages.find((l) => l.code === code) || languages[0];
  });

  const setLanguage = useCallback(
    async (code: string) => {
      if (code === language.code) return;
      if (!languages.some((l) => l.code === code)) return;

      const targetLang = languages.find((l) => l.code === code)!;
      setLanguageState(targetLang);
      setStoredLanguage(code);

      setGoogtransCookie('en', code);

      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0 && languages.some((l) => l.code === segments[0])) {
        segments.shift();
      }
      const newPath = `/${code}${segments.length > 0 ? '/' + segments.join('/') : ''}`;

      router.push(newPath);

      // Kick off translation loading directly here rather than relying
      // solely on the effect below — router.push() re-renders the [locale]
      // layout for the new segment, which can remount this provider before
      // the effect for the old instance gets a chance to run. The
      // translation-manager module's own promise/flag state lives outside
      // React entirely, so calling this eagerly (in addition to the
      // mount-time effect, which still covers direct navigation to a
      // non-English URL) is safe and not redundant work.
      if (code !== 'en') {
        setIsTranslating(true);
        loadGoogleTranslateScript()
          .then(() => {
            setTimeout(() => translatePage(code), 800);
          })
          .finally(() => setIsTranslating(false));
      }
    },
    [language.code, pathname, router]
  );

  // Sync with stored language on mount
  useEffect(() => {
    const stored = getStoredLanguage();
    const initialCode = (() => {
      const c = getStoredLanguage();
      return languages.find((l) => l.code === c)?.code || 'en';
    })();
    if (stored !== initialCode && languages.some((l) => l.code === stored)) {
      const targetLang = languages.find((l) => l.code === stored)!;
      setLanguageState(targetLang);
      setGoogtransCookie('en', stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Google Translate script and apply translation for non-English locales
  useEffect(() => {
    if (language.code !== 'en') {
      loadGoogleTranslateScript().then(() => {
        setTimeout(() => translatePage(language.code), 800);
      });
    }
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
