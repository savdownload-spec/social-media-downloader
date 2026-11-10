import { Plus_Jakarta_Sans } from 'next/font/google';
import { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { AdBanner } from '@/components/layout/AdBanner';
import { Footer } from '@/components/layout/Footer';
import { PublicShell } from '@/components/layout/PublicShell';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmProvider';
import { InstallProvider } from '@/components/pwa/InstallProvider';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { siteConfig } from '@/config/site';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Providers } from '@/components/providers';
import { PricingProvider } from '@/components/pricing/PricingProvider';
import { getPricingConfig } from '@/lib/pricing-server';
import { SupportChat } from '@/components/support/SupportChat';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { THEME_INIT_SCRIPT } from '@/lib/theme/theme-init-script';
import { buildMetadata, jsonLd, organizationSchema, websiteSchema } from '@/lib/seo';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleTagManager } from '@/components/analytics/GoogleTagManager';
import Script from 'next/script';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export function generateMetadata(): Metadata {
  const title = `Download Videos, Images & More | ${siteConfig.name}`;
  const description = 'Fast, free, and easy-to-use tools for downloading content from social media platforms';

  return {
    ...buildMetadata({ title, description, path: '/' }),
    title: {
      default: title,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    keywords: [...siteConfig.keywords],
    // Suppresses Chrome's own native "Translate this page?" prompt, which
    // otherwise pops up on top of our own language dropdown once the
    // Google Website Translator widget swaps the visible text, Google's
    // documented fix for sites that drive the widget themselves rather
    // than relying on the browser's automatic offer.
    other: {
      google: 'notranslate',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0A14' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pricing = await getPricingConfig();

  return (
    // suppressHydrationWarning: the blocking script below mutates this
    // element's class/data attributes/style before hydration to prevent a
    // theme flash; React never renders those attributes itself, so this
    // only silences the (harmless, expected) mismatch React would otherwise
    // warn about on this one node.
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      {/* Keep head framework-managed: replacing its innerHTML can remove
          Next.js stylesheet links during client rendering/recovery. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd({ '@graph': [organizationSchema(), websiteSchema()] })}
        />
      </head>
      <body className="font-sans bg-surface text-text antialiased">
        <Providers>
          <PricingProvider value={pricing}>
            <LanguageProvider>
              <ThemeProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <InstallProvider>
                    <ServiceWorkerRegister />
                    <PublicShell>
                      <Header />
                      <AdBanner />
                    </PublicShell>
                    <main className="min-h-[calc(100vh-4rem)]">{children}</main>
                    <PublicShell>
                      <Footer />
                      <SupportChat />
                    </PublicShell>
                  </InstallProvider>
                </ConfirmProvider>
              </ToastProvider>
              </ThemeProvider>
            </LanguageProvider>
          </PricingProvider>
        </Providers>
        {/* GoogleTagManager: loads GTM afterInteractive to avoid blocking FCP/LCP */}
        <GoogleTagManager id="GTM-5SX8RKCS" />
        {/* Ahrefs Web Analytics: loads afterInteractive to avoid blocking FCP/LCP */}
        <Script
          id="ahrefs-analytics"
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="Y4hjtZYrkSQE4nUigWpKbg"
          strategy="afterInteractive"
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
