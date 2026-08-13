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
    // next-intl's default behavior for a missing message is to return the
    // key itself (a truthy string) rather than throwing or returning
    // undefined, which silently breaks every `t(key) || fallback` call site
    // across the app whenever a locale is missing a key, showing the raw
    // "some.dotted.key" string in the UI instead of the intended fallback.
    // Checking the raw messages object first (where a missing key is
    // genuinely undefined) lets callers' `||` fallbacks work correctly.
    if (raw === undefined) return undefined;
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
