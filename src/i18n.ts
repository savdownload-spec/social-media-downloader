import { getRequestConfig } from 'next-intl/server';

// English is the sole canonical/source content everywhere — the Google
// Translate widget (src/lib/translation-manager.ts) handles all non-English
// display client-side, so there's no per-locale request routing to resolve.
export default getRequestConfig(async () => {
  const messages = (await import('./i18n/translations/en.json')).default;
  return { locale: 'en', messages };
});
