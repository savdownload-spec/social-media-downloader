/**
 * Pure, framework-free PWA install helpers: device/display-mode detection and
 * localStorage/sessionStorage persistence so the install prompt never nags —
 * one dismissal snoozes it for two weeks, and it never shows more than once
 * per browser session even if not explicitly dismissed.
 */

const LS_DISMISSED_UNTIL = 'savdown:pwa:dismissedUntil';
const LS_INSTALLED = 'savdown:pwa:installed';
const SS_SHOWN_THIS_SESSION = 'savdown:pwa:shownThisSession';

const DISMISS_DAYS = 14;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** iPhone/iPad/iPod, including iPadOS 13+ which reports as "Macintosh" but has touch. */
export function isIOSDevice(): boolean {
  if (!isBrowser()) return false;
  const ua = window.navigator.userAgent;
  const isClassicIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS13Plus = ua.includes('Macintosh') && navigator.maxTouchPoints > 1;
  return isClassicIOS || isIPadOS13Plus;
}

export function isSafariBrowser(): boolean {
  if (!isBrowser()) return false;
  const ua = window.navigator.userAgent;
  return /^((?!chrome|android|crios|fxios|edg|opr).)*safari/i.test(ua);
}

/** True once the app is actually running installed (standalone), on any platform. */
export function isStandaloneDisplayMode(): boolean {
  if (!isBrowser()) return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function isMobileViewport(): boolean {
  if (!isBrowser()) return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

export function getInstalledFlag(): boolean {
  if (!isBrowser()) return false;
  try {
    return localStorage.getItem(LS_INSTALLED) === '1';
  } catch {
    return false;
  }
}

export function setInstalledFlag(): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS_INSTALLED, '1');
  } catch {
    /* private browsing / storage disabled — fail silently */
  }
}

export function isDismissed(): boolean {
  if (!isBrowser()) return false;
  try {
    const until = Number(localStorage.getItem(LS_DISMISSED_UNTIL) || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

export function dismissForDays(days = DISMISS_DAYS): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS_DISMISSED_UNTIL, String(Date.now() + days * 86_400_000));
  } catch {
    /* ignore */
  }
}

export function wasShownThisSession(): boolean {
  if (!isBrowser()) return false;
  try {
    return sessionStorage.getItem(SS_SHOWN_THIS_SESSION) === '1';
  } catch {
    return false;
  }
}

export function markShownThisSession(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(SS_SHOWN_THIS_SESSION, '1');
  } catch {
    /* ignore */
  }
}
