import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import '../globals.css';
import { Header } from '@/components/layout/Header';
import { AdBanner } from '@/components/layout/AdBanner';
import { Footer } from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmProvider';
import { InstallProvider } from '@/components/pwa/InstallProvider';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { siteConfig } from '@/config/site';
import { jsonLd } from '@/lib/seo';
import { locales } from '@/config/locales';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'hero' });
  const siteT = await getTranslations({ locale, namespace: 'footer' });

  const title = `${t('title')} | ${siteConfig.name}`;
  const description = t('subtitle') || siteConfig.description;

  const languages: Record<string, string> = {};
  locales.forEach((l) => {
    languages[l] = `${siteConfig.url}/${l}`;
  });

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/${locale}`,
      languages,
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/${locale}`,
      siteName: siteConfig.name,
      locale,
      type: 'website',
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${jakarta.variable}`}>
      <body className="font-sans bg-surface text-text antialiased">
        <NextIntlClientProvider messages={messages}>
          <LanguageProvider initialLocale={locale}>
            <ToastProvider>
              <ConfirmProvider>
                <InstallProvider>
                  <ServiceWorkerRegister />
                  <Header />
                  <AdBanner />
                  <main className="min-h-[calc(100vh-4rem)]">{children}</main>
                  <Footer />
                </InstallProvider>
              </ConfirmProvider>
            </ToastProvider>
          </LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
