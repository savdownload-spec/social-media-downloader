import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from './config/locales';

export { locales };
export type { Locale };

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = locales.includes(requested as Locale) ? (requested as Locale) : 'en';

  if (!locales.includes(locale)) notFound();

  let messages = {};
  try {
    messages = (await import(`./i18n/translations/${locale}.json`)).default;
  } catch {
    messages = (await import(`./i18n/translations/en.json`)).default;
  }

  return { locale, messages };
});
