'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { languages } from '@/config/languages';

type LanguageSelectorProps = {
  variant?: 'header' | 'footer';
};

const MENU_WIDTH = { header: 200, footer: 180 } as const;

export function LanguageSelector({ variant = 'header' }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const { language, setLanguage, isTranslating } = useLanguage();
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

  // The dropdown is rendered via a portal into document.body (see `menu`
  // below) rather than as a normal absolutely-positioned child. Several
  // trigger locations, most notably the mobile nav drawer, have an
  // `overflow-hidden` ancestor needed for its open/close slide animation,
  // which was silently clipping the dropdown down to an empty-looking box.
  // A portal escapes that ancestor entirely; position is computed from the
  // trigger button's own bounding rect instead of CSS `absolute` offsets.
  useEffect(() => {
    if (!open) return;
    updateCoords();

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    // Portaled content no longer moves with the page when a scrollable
    // ancestor scrolls, so close on scroll rather than continuously
    // re-anchoring it, simpler and standard behavior for lightweight
    // dropdowns like this one. But the menu's own list is itself
    // scrollable (max-h + overflow-y-auto, since there are more languages
    // than fit on screen at once), scroll listeners are registered with
    // `capture: true` so they see that internal scroll too, which must be
    // ignored or the list would close itself the instant a user tried to
    // scroll through it.
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

  const handleLanguageSelect = (langCode: string) => {
    setLanguage(langCode);
    setOpen(false);
  };

  const menu =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, bottom: coords.bottom, left: coords.left, width: menuWidth }}
            className={
              variant === 'footer'
                ? 'z-50 bg-ink border border-white/10 rounded-xl shadow-soft-lg py-2 max-h-[280px] overflow-y-auto'
                : 'z-50 bg-white border border-border rounded-xl shadow-soft-lg py-2 max-h-[320px] overflow-y-auto'
            }
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors ${
                  lang.code === language.code
                    ? variant === 'footer'
                      ? 'text-white bg-white/10'
                      : 'text-primary bg-primary-light/50'
                    : variant === 'footer'
                      ? 'text-ink-muted hover:text-white hover:bg-white/5'
                      : 'text-text-muted hover:text-text hover:bg-surface'
                }`}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span>{lang.label}</span>
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
          aria-label="Select language"
          aria-expanded={open}
        >
          <Globe className="w-4 h-4" />
          <span>{isTranslating ? '...' : language.label}</span>
          <ChevronDown className="w-3 h-3" />
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
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors rounded-full px-3 py-1.5 hover:bg-surface"
        aria-label="Select language"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden lg:inline">{isTranslating ? '...' : language.label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {menu}
    </div>
  );
}
