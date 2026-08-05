/** Supported locale codes — shared between server and client code. */
export const locales = ['en', 'es', 'fr', 'de', 'pt', 'hi', 'ar', 'ja', 'ko', 'zh', 'tr', 'ru'] as const;
export type Locale = (typeof locales)[number];
