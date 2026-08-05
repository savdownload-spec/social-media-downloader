'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, Zap } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { Container } from './Container';
import { MegaMenu } from './MegaMenu';
import { MobileNav } from './MobileNav';
import { useTranslation } from '@/i18n';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslation();

  return (
    <header className="sticky top-0 z-50 glass border-b border-border-light">
      <Container className="flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="group transition-transform hover:scale-[1.02] shrink-0" aria-label="SavDown home">
          <Logo variant="dark" height={30} linked={false} />
        </Link>

        {/* Desktop mega menu */}
        <nav className="hidden md:flex items-center" aria-label="Primary navigation">
          <MegaMenu />
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <LanguageSelector variant="header" />
          <Link
            href="/search"
            aria-label={t('common.search')}
            className="w-10 h-10 rounded-full hover:bg-primary-light/60 flex items-center justify-center transition-colors"
          >
            <Search className="w-4 h-4 text-text-muted" />
          </Link>
          <Link
            href="/#tools"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:shadow-[0_14px_48px_-8px_rgb(124_58_237_/_0.5)] hover:bg-[position:100%_50%] transition-all"
          >
            <Zap className="w-3.5 h-3.5" /> {t('common.getStarted')}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden w-10 h-10 rounded-full hover:bg-surface flex items-center justify-center transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? t('common.close') : t('common.menu')}
          aria-expanded={mobileOpen}
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileOpen
              ? <motion.span key="x"    initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X    className="w-5 h-5" /></motion.span>
              : <motion.span key="menu" initial={{ rotate:  90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="w-5 h-5" /></motion.span>
            }
          </AnimatePresence>
        </button>
      </Container>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden border-t border-border-light bg-white"
          >
            <Container className="py-3">
              <div className="flex items-center justify-between pb-3 border-b border-border-light mb-1">
                <LanguageSelector variant="header" />
                <Link href="/search" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
                  <Search className="w-4 h-4" /> {t('common.search')}
                </Link>
              </div>
              <MobileNav close={() => setMobileOpen(false)} />
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
