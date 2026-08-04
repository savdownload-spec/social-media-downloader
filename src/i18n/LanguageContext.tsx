'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Language } from '@/config/languages';
import { languages } from '@/config/languages';

// Import all translations
import enTranslations from './translations/en.json';
import esTranslations from './translations/es.json';
import frTranslations from './translations/fr.json';
import deTranslations from './translations/de.json';
import ptTranslations from './translations/pt.json';
import hiTranslations from './translations/hi.json';
import arTranslations from './translations/ar.json';
import jaTranslations from './translations/ja.json';
import koTranslations from './translations/ko.json';
import zhTranslations from './translations/zh.json';
import trTranslations from './translations/tr.json';
import ruTranslations from './translations/ru.json';

type Translations = typeof enTranslations;

const translationMap: Record<string, Translations> = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  de: deTranslations,
  pt: ptTranslations,
  hi: hiTranslations,
  ar: arTranslations,
  ja: jaTranslations,
  ko: koTranslations,
  zh: zhTranslations,
  tr: trTranslations,
  ru: ruTranslations,
};

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (langCode: string) => void;
  t: (key: string) => string;
  translations: Translations;
}

export type { LanguageContextType };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export { LanguageContext };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(languages[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Get language from localStorage or browser
    const savedLang = localStorage.getItem('preferredLanguage');
    const browserLang = navigator.language.split('-')[0];
    
    const langToUse = savedLang || browserLang;
    const language = languages.find(l => l.code === langToUse) || languages[0];
    
    setCurrentLanguage(language);
    setMounted(true);
  }, []);

  const setLanguage = (langCode: string) => {
    const language = languages.find(l => l.code === langCode);
    if (language) {
      setCurrentLanguage(language);
      localStorage.setItem('preferredLanguage', langCode);
      // Also set the Google Translate cookie for fallback
      document.cookie = `googtrans=/auto/${langCode}; path=/; max-age=31536000`;
    }
  };

  const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((current, prop) => current?.[prop], obj) || path;
  };

  const t = (key: string): string => {
    const translations = translationMap[currentLanguage.code] || enTranslations;
    return getNestedValue(translations, key);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        t,
        translations: translationMap[currentLanguage.code] || enTranslations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
