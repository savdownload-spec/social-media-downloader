'use client';

import { Download, Share, SquarePlus, Zap, Smartphone, WifiOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useInstallPwa } from './InstallProvider';

const benefits = [
  { icon: Zap, text: 'One tap to launch, no browser bar' },
  { icon: Smartphone, text: 'Feels like a native app' },
  { icon: WifiOff, text: 'Faster loading, even on slow networks' },
];

/**
 * Shared install UI, used both for the automatic mobile bottom-sheet and the
 * manual "Install App" entry point in the header. Content branches on what
 * the platform actually supports: a real native prompt (Android/Chromium) vs
 * manual Add to Home Screen steps (iOS Safari, which exposes no install API).
 */
export function InstallSheet() {
  const { sheetOpen, closeSheet, hasNativePrompt, isIOS, triggerNativeInstall } = useInstallPwa();

  return (
    <Modal open={sheetOpen} onClose={closeSheet} size="sm">
      <div className="-mt-1 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192.png"
          alt="SavDown"
          width={64}
          height={64}
          className="w-16 h-16 rounded-2xl shadow-soft-md ring-1 ring-border-light"
        />

        <h2 className="mt-4 text-lg font-bold tracking-tight text-text">Install SavDown</h2>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">
          Add SavDown to your {isIOS ? 'Home Screen' : 'device'} for instant access, every time.
        </p>

        <ul className="mt-5 w-full space-y-2.5 text-left">
          {benefits.map((b) => (
            <li key={b.text} className="flex items-center gap-3 text-sm text-text-muted">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <b.icon className="h-4 w-4" />
              </span>
              {b.text}
            </li>
          ))}
        </ul>

        {hasNativePrompt ? (
          <div className="mt-6 w-full space-y-2">
            <button
              type="button"
              onClick={triggerNativeInstall}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-glow-lg transition-shadow hover:shadow-[0_14px_48px_-8px_rgb(124_58_237_/_0.5)]"
            >
              <Download className="h-4 w-4" /> Install App
            </button>
            <button
              type="button"
              onClick={closeSheet}
              className="inline-flex w-full items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface hover:text-text"
            >
              Not now
            </button>
          </div>
        ) : isIOS ? (
          <div className="mt-6 w-full">
            <ol className="space-y-3 text-left">
              <li className="flex items-start gap-3 text-sm text-text">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-text text-xs font-bold text-white">1</span>
                <span className="pt-0.5">
                  Tap the <Share className="mx-0.5 inline h-4 w-4 -translate-y-px text-primary" /> Share icon in Safari
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm text-text">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-text text-xs font-bold text-white">2</span>
                <span className="pt-0.5">
                  Scroll down and tap{' '}
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <SquarePlus className="h-4 w-4 text-primary" /> Add to Home Screen
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm text-text">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-text text-xs font-bold text-white">3</span>
                <span className="pt-0.5">Tap <span className="font-semibold">Add</span> in the top right</span>
              </li>
            </ol>
            <button
              type="button"
              onClick={closeSheet}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-glow-lg"
            >
              Got it
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
