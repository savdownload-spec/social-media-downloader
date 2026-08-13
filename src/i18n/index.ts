'use client';

import { useTranslations, useMessages } from 'next-intl';

/**
 * Client-side translation hook.
 *
 * Returns an augmented t() function:
 *  - t('hero.title')                → string (via next-intl useTranslations)
 *  - t('compatibility.devices')     → any (falls back to raw messages for arrays/objects)
 *
 * For array-typed values (e.g. faqs.items, howItWorks.steps), next-intl v4 throws
 * if you call t() directly. We intercept those by also exposing raw message access.
 */
export function useTranslation() {
  const t = useTranslations();
  const messages = useMessages() as Record<string, any>;

  // Helper to resolve dot-notation path in messages object
  function getRaw(key: string): any {
    return key.split('.').reduce((acc: any, part) => acc?.[part], messages);
  }

  // Proxy: try t() first (strings), fall back to raw for arrays/objects
  function translate(key: string): any {
    const raw = getRaw(key);
    // Return an empty string for missing keys so string operations such as
    // `.split()` remain safe and existing `t(key) || fallback` call sites
    // continue to use their intended fallback text.
    if (raw === undefined) return '';
    if (Array.isArray(raw) || (typeof raw === 'object' && !Array.isArray(raw))) {
      return raw;
    }
    try {
      return t(key as any);
    } catch {
      return raw;
    }
  }

  return translate;
}
