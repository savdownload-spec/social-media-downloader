'use client';

import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from 'react';
import { useToast } from '@/components/ui/Toast';
import { InstallSheet } from './InstallSheet';
import * as pwa from '@/lib/pwa';

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
};

type InstallContextValue = {
  /** There's a real, working entry point to show the user (button, menu item, etc.). */
  canInstall: boolean;
  /** The app is already installed / running standalone. */
  isInstalled: boolean;
  /** iOS Safari — no native prompt exists, so we show manual instructions instead. */
  isIOS: boolean;
  /** Android/Chromium native `beforeinstallprompt` is available. */
  hasNativePrompt: boolean;
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  triggerNativeInstall: () => Promise<void>;
};

const InstallContext = createContext<InstallContextValue | null>(null);

export function useInstallPwa(): InstallContextValue {
  const ctx = useContext(InstallContext);
  if (!ctx) throw new Error('useInstallPwa must be used within <InstallProvider>');
  return ctx;
}

/** Wait a beat before auto-showing so it never feels like a jarring interstitial. */
const AUTO_SHOW_DELAY_MS = 2500;

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setIsInstalled(pwa.isStandaloneDisplayMode() || pwa.getInstalledFlag());
    setIsIOS(pwa.isIOSDevice() && pwa.isSafariBrowser());

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      pwa.setInstalledFlag();
      setIsInstalled(true);
      setDeferredPrompt(null);
      setSheetOpen(false);
      toast.success('SavDown installed', 'Launch it anytime from your home screen or app list.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const hasNativePrompt = deferredPrompt !== null;
  const canInstall = !isInstalled && (hasNativePrompt || isIOS);

  // Auto-show once on mobile, after a short delay, unless recently dismissed
  // or already shown this session.
  useEffect(() => {
    if (!canInstall) return;
    if (!pwa.isMobileViewport()) return;
    if (pwa.isDismissed()) return;
    if (pwa.wasShownThisSession()) return;

    const timer = setTimeout(() => {
      pwa.markShownThisSession();
      setSheetOpen(true);
    }, AUTO_SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [canInstall]);

  const openSheet = useCallback(() => {
    pwa.markShownThisSession();
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    pwa.dismissForDays();
  }, []);

  const triggerNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setSheetOpen(false);
    // 'accepted' resolves via the appinstalled event (toast + permanent flag).
    if (choice.outcome === 'dismissed') pwa.dismissForDays();
  }, [deferredPrompt]);

  return (
    <InstallContext.Provider
      value={{ canInstall, isInstalled, isIOS, hasNativePrompt, sheetOpen, openSheet, closeSheet, triggerNativeInstall }}
    >
      {children}
      <InstallSheet />
    </InstallContext.Provider>
  );
}
