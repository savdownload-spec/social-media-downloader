'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/navigation';
import { languages } from '@/config/languages';

type LanguageSelectorProps = {
  variant?: 'header' | 'footer';
};

export function LanguageSelector({ variant = 'header' }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(l => l.code === locale) || languages[0];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLanguageSelect = (langCode: string) => {
    router.replace(pathname, { locale: langCode });
    setOpen(false);
  };

  // Footer variant — simple inline display
  if (variant === 'footer') {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm text-ink-muted hover:text-white transition-colors"
          aria-label="Select language"
          aria-expanded={open}
        >
          <Globe className="w-4 h-4" />
          <span>{currentLanguage.label}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {open && (
          <div className="absolute bottom-full mb-2 left-0 z-50 bg-ink border border-white/10 rounded-xl shadow-soft-lg py-2 min-w-[180px] max-h-[280px] overflow-y-auto">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors ${
                  lang.code === locale
                    ? 'text-white bg-white/10'
                    : 'text-ink-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Header variant — compact pill
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors rounded-full px-3 py-1.5 hover:bg-surface"
        aria-label="Select language"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden lg:inline">{currentLanguage.label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-border rounded-xl shadow-soft-lg py-2 min-w-[200px] max-h-[320px] overflow-y-auto">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors ${
                lang.code === locale
                  ? 'text-primary bg-primary-light/50'
                  : 'text-text-muted hover:text-text hover:bg-surface'
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
