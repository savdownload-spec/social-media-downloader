'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { resolveDayNight } from '@/lib/theme/resolve-auto-theme';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextType = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** False until the client has synced with the pre-paint init script's DOM
   *  state — theme-aware UI (e.g. ThemeToggle's icon) should wait on this to
   *  avoid a one-frame mismatch; the page background itself is never wrong
   *  because the blocking script already applied it before hydration. */
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'sd_theme_mode';
const AUTO_RECHECK_MS = 5 * 60 * 1000; // catches a day/night boundary crossed mid-session
const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#FFFFFF', dark: '#0B0918' };

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', THEME_COLOR[resolved]);
}

/** Post-mount auto resolution uses the browser's own timezone (more precise
 *  than the coarse IP-derived one used only for the zero-flash first paint)
 *  falling back to OS theme, then light — same order as the init script. */
function computeAutoTheme(): ResolvedTheme {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) return resolveDayNight(timezone);
  } catch {
    // fall through
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();

  // Sync React state to whatever the blocking init script already applied.
  useEffect(() => {
    const root = document.documentElement;
    const domMode = (root.getAttribute('data-theme-mode') as ThemeMode | null) ?? 'auto';
    const domResolved = (root.getAttribute('data-theme') as ResolvedTheme | null) ?? 'light';
    setModeState(domMode);
    setResolvedTheme(domResolved);
    setMounted(true);
  }, []);

  // Keep auto mode fresh across a long-lived session (day/night boundary).
  useEffect(() => {
    if (!mounted || mode !== 'auto') return;
    const recheck = () => setResolvedTheme((prev) => {
      const next = computeAutoTheme();
      return prev === next ? prev : next;
    });
    const interval = setInterval(recheck, AUTO_RECHECK_MS);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [mounted, mode]);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(resolvedTheme);
  }, [mounted, resolvedTheme]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode / storage full): the choice
      // still applies for this page view, it just won't persist on reload.
    }
    document.documentElement.setAttribute('data-theme-mode', next);
    setResolvedTheme(next === 'auto' ? computeAutoTheme() : next);

    // Cross-device sync only, best-effort — never blocks the local UI update
    // and silently no-ops for anonymous visitors (401, ignored below).
    fetch('/api/account/theme', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: next }),
    }).catch(() => {});
  }, []);

  // First visit on a device, while logged in: adopt the account's saved
  // preference — but only if this device has no local choice of its own yet
  // (localStorage stays the per-device source of truth otherwise).
  useEffect(() => {
    if (!mounted || status !== 'authenticated') return;
    let hasLocalChoice = true;
    try {
      hasLocalChoice = localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      hasLocalChoice = true;
    }
    if (hasLocalChoice) return;

    fetch('/api/account/theme')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const serverMode = json?.data?.mode;
        if (serverMode === 'light' || serverMode === 'dark' || serverMode === 'auto') {
          setMode(serverMode);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, status]);

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
