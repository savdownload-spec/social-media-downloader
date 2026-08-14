import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Metadata, Viewport } from 'next';
import './globals.css';
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
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Providers } from '@/components/providers';
import { PricingProvider } from '@/components/pricing/PricingProvider';
import { getPricingConfig } from '@/lib/pricing-server';
import { SupportChat } from '@/components/support/SupportChat';

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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('hero');

  const title = `${t('title')} | ${siteConfig.name}`;
  const description = t('subtitle') || siteConfig.description;

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: title,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    keywords: [...siteConfig.keywords],
    alternates: {
      canonical: siteConfig.url,
    },
    // Suppresses Chrome's own native "Translate this page?" prompt, which
    // otherwise pops up on top of our own language dropdown once the
    // Google Website Translator widget swaps the visible text, Google's
    // documented fix for sites that drive the widget themselves rather
    // than relying on the browser's automatic offer.
    other: {
      google: 'notranslate',
    },
    openGraph: {
      type: 'website',
      url: siteConfig.url,
      title,
      description,
      siteName: siteConfig.name,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: siteConfig.twitterHandle,
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [
        { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
        { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      shortcut: '/icon-32.png',
      apple: '/icon-180.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: siteConfig.name,
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [messages, pricing] = await Promise.all([getMessages(), getPricingConfig()]);

  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="font-sans bg-surface text-text antialiased">
        <Providers>
          <NextIntlClientProvider messages={messages}>
            <PricingProvider value={pricing}>
            <LanguageProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <InstallProvider>
                    <ServiceWorkerRegister />
                    <Header />
                    <AdBanner />
                    <main className="min-h-[calc(100vh-4rem)]">{children}</main>
                    <Footer />
                    <SupportChat />
                  </InstallProvider>
                </ConfirmProvider>
              </ToastProvider>
            </LanguageProvider>
            </PricingProvider>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
