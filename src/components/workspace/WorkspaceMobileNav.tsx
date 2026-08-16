'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home,
  DownloadCloud,
  History,
  Plus,
  Menu,
  X,
  FolderOpen,
  Layers,
  ListChecks,
  Wrench,
  CreditCard,
  Settings,
  LifeBuoy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const TABS = [
  { label: 'Home', href: '/workspace', icon: Home },
  { label: 'Downloads', href: '/workspace/downloads', icon: DownloadCloud },
] as const;

const TABS_RIGHT = [
  { label: 'Activity', href: '/workspace/activity', icon: History },
] as const;

const MORE_LINKS = [
  { label: 'My Files', href: '/workspace/files', icon: FolderOpen, badge: 'soon' },
  { label: 'Collections', href: '/workspace/collections', icon: Layers, badge: 'soon' },
  { label: 'Batch', href: '/workspace/batch', icon: ListChecks, badge: 'soon' },
  { label: 'All Tools', href: '/tools', icon: Wrench },
  { label: 'Credits & Billing', href: '/account/billing', icon: CreditCard },
  { label: 'Profile & Settings', href: '/account', icon: Settings },
];

/** Dispatched so the Home screen's UniversalInput can focus itself even when
 *  the FAB is tapped from a screen that already is Home. */
export const FOCUS_UNIVERSAL_INPUT_EVENT = 'savdown:focus-universal-input';

export function WorkspaceMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  function handleFabClick() {
    if (pathname === '/workspace') {
      window.dispatchEvent(new CustomEvent(FOCUS_UNIVERSAL_INPUT_EVENT));
    } else {
      router.push('/workspace?focus=1');
    }
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/workspace' && pathname.startsWith(href));
  }

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-card border-t border-border pb-[env(safe-area-inset-bottom)]"
        aria-label="Workspace navigation"
      >
        <div className="grid grid-cols-5 items-center h-16">
          {TABS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-medium h-full transition-colors',
                isActive(href) ? 'text-primary' : 'text-text-subtle',
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}

          {/* Center FAB — the universal input is the primary mobile action */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleFabClick}
              aria-label="Paste a link, upload a file, or search"
              className="w-12 h-12 -mt-6 rounded-2xl bg-gradient-brand shadow-glow-lg flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {TABS_RIGHT.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-medium h-full transition-colors',
                isActive(href) ? 'text-primary' : 'text-text-subtle',
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium h-full text-text-subtle"
            aria-label="More"
          >
            <Menu className="w-5 h-5" />
            More
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-card rounded-t-3xl border-t border-border max-h-[75vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-2">
                <p className="text-sm font-bold text-text">More</p>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-surface flex items-center justify-center text-text-muted"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-3 pb-4 space-y-0.5">
                {MORE_LINKS.map(({ label, href, icon: Icon, badge }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-text hover:bg-surface transition-colors"
                  >
                    <Icon className="w-[18px] h-[18px] text-text-subtle" />
                    <span className="flex-1">{label}</span>
                    {badge === 'soon' && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-surface text-text-subtle border border-border-light rounded-full px-1.5 py-0.5">
                        Soon
                      </span>
                    )}
                  </Link>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-border-light flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Theme</span>
                <ThemeToggle variant="header" />
              </div>
              <div className="px-3 pb-5">
                <Link
                  href="/"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-text-subtle hover:bg-surface transition-colors"
                >
                  <LifeBuoy className="w-[18px] h-[18px]" />
                  Back to site
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
