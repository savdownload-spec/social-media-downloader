'use client';

import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';
import { languages } from '@/config/languages';

// Import all translations
import enTranslations from './translations/en.json';

const fallbackTranslations = enTranslations;

/**
 * Safe hook for accessing the translation function.
 * Falls back to English if provider is not available.
 */
export function useTranslation() {
  const context = useContext(LanguageContext);
  
  if (!context) {
    // Return a safe fallback function that always returns English
    const getNestedValue = (obj: any, path: string): string => {
      return path.split('.').reduce((current, prop) => current?.[prop], obj) || path;
    };
    
    return (key: string): string => {
      return getNestedValue(fallbackTranslations, key);
    };
  }
  
  return context.t;
}
