'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Cookie } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { acceptAllPreferences, defaultPreferences } from '@/lib/cookie-consent';

export function CookieConsentBanner() {
  const { consent, openSettings, savePreferences } = useCookieConsent();
  const ref = useRef<HTMLElement>(null);
  const visible = consent === null;

  // Publishes the banner height so fixed UI above it (support button, toasts)
  // sits on top of the banner instead of underneath.
  useEffect(() => {
    const element = ref.current;
    if (!visible || !element) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty('--sd-consent-h', `${element.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--sd-consent-h');
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <section
      ref={ref}
      role="region"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      data-sd-consent-banner
      className="fixed inset-x-0 bottom-0 z-[80] animate-fade-up border-t border-border-light bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_-8px_rgb(15_11_30_/_0.12)] motion-reduce:animate-none dark:border-border dark:bg-card dark:shadow-[0_-8px_30px_-6px_rgb(0_0_0_/_0.7)]"
    >
      <Container className="py-4 lg:py-3">
        <div className="lg:flex lg:items-center lg:gap-6">
          <span
            className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-light text-primary lg:grid"
            aria-hidden="true"
          >
            <Cookie className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <p id="cookie-consent-title" className="text-[15px] font-bold tracking-tight text-text">
              We value your privacy
            </p>
            <p
              id="cookie-consent-description"
              className="mt-1 text-[13px] leading-relaxed text-text-muted"
            >
              We use cookies to enhance your experience, improve website performance and analyze
              traffic. Manage your preferences at any time.{' '}
              <Link
                href="/privacy"
                className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
              >
                Privacy Policy
              </Link>
            </p>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:ml-auto sm:flex lg:mt-0 lg:shrink-0">
            <Button variant="ghost" size="sm" className="px-2 sm:px-3.5" onClick={openSettings}>
              Cookie Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold"
              onClick={() => savePreferences(defaultPreferences())}
            >
              Reject All
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="col-span-2 sm:col-span-1"
              onClick={() => savePreferences(acceptAllPreferences())}
            >
              Accept All
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
