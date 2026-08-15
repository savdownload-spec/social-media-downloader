'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';

type ThemeToggleProps = {
  variant?: 'header' | 'footer';
};

const MENU_WIDTH = { header: 160, footer: 160 } as const;

const OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'auto', label: 'Auto', icon: Monitor },
];

// Mirrors LanguageSelector's portal-based dropdown pattern (see
// src/components/ui/LanguageSelector.tsx) so it isn't clipped by the mobile
// nav drawer's overflow-hidden ancestor, and positions itself from the
// trigger's own bounding rect rather than CSS absolute offsets.
export function ThemeToggle({ variant = 'header' }: ThemeToggleProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const { mode, setMode, mounted } = useTheme();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuWidth = MENU_WIDTH[variant];

  const updateCoords = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
    setCoords(
      variant === 'footer'
        ? { bottom: window.innerHeight - rect.top + 8, left }
        : { top: rect.bottom + 8, left }
    );
  }, [variant, menuWidth]);

  useEffect(() => {
    if (!open) return;
    updateCoords();

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScroll(e: Event) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [open, updateCoords]);

  const handleSelect = (next: ThemeMode) => {
    setMode(next);
    setOpen(false);
  };

  // Defaults to Monitor (the "auto" icon) until mounted so a manual
  // light/dark choice from a previous visit never flashes the wrong icon.
  const ActiveIcon = mounted ? OPTIONS.find((o) => o.mode === mode)?.icon ?? Monitor : Monitor;

  const menu =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, bottom: coords.bottom, left: coords.left, width: menuWidth }}
            className={
              variant === 'footer'
                ? 'z-50 bg-ink border border-white/10 rounded-xl shadow-soft-lg py-2'
                : 'z-50 bg-white dark:bg-ink-800 border border-border dark:border-white/10 rounded-xl shadow-soft-lg py-2'
            }
          >
            {OPTIONS.map(({ mode: optMode, label, icon: Icon }) => (
              <button
                key={optMode}
                onClick={() => handleSelect(optMode)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors ${
                  optMode === mode
                    ? variant === 'footer'
                      ? 'text-white bg-white/10'
                      : 'text-primary bg-primary-light/50'
                    : variant === 'footer'
                      ? 'text-ink-muted hover:text-white hover:bg-white/5'
                      : 'text-text-muted hover:text-text hover:bg-surface dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{label}</span>
                {optMode === mode && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  if (variant === 'footer') {
    return (
      <div className="relative">
        <button
          ref={triggerRef}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm text-ink-muted hover:text-white transition-colors"
          aria-label="Change theme"
          aria-expanded={open}
        >
          <ActiveIcon className="w-4 h-4" />
          <span className="capitalize">{mode}</span>
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        title="Change theme"
        aria-expanded={open}
        className="w-10 h-10 rounded-full hover:bg-primary-light/60 flex items-center justify-center transition-colors"
      >
        <ActiveIcon className="w-4 h-4 text-text-muted" />
      </button>
      {menu}
    </div>
  );
}
