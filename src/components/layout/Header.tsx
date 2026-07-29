'use client';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Container } from './Container';

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border-light">
      <Container className="flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand bg-[length:200%_200%] flex items-center justify-center text-white font-bold text-base shadow-glow-lg group-hover:scale-105 group-hover:rotate-3 transition-transform">
            S
          </div>
          <span className="font-bold text-text tracking-tight text-lg">{siteConfig.name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-text-muted hover:text-text transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:rounded-full after:bg-gradient-brand hover:after:w-full after:transition-all"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search"
            className="w-10 h-10 rounded-full hover:bg-primary-light/60 flex items-center justify-center transition-colors"
          >
            <Search className="w-4 h-4 text-text-muted" />
          </Link>
          <Link
            href="/#tools"
            className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:shadow-[0_14px_48px_-8px_rgb(124_58_237_/_0.5)] hover:bg-[position:100%_50%] transition-all"
          >
            Get started
          </Link>
        </div>

        <button
          className="md:hidden w-10 h-10 rounded-full hover:bg-surface flex items-center justify-center"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </Container>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border-light bg-white"
          >
            <Container className="py-4 flex flex-col gap-1">
              {siteConfig.navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-text-muted hover:text-text"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/search"
                onClick={() => setOpen(false)}
                className="py-3 text-text-muted hover:text-text"
              >
                Search
              </Link>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
