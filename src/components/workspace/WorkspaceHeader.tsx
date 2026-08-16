'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Search, Menu, Coins, LogOut, User as UserIcon, Settings, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useInstallPwa } from '@/components/pwa/InstallProvider';

type WorkspaceUser = { name: string | null; email: string | null; image: string | null };

interface Props {
  user: WorkspaceUser;
  credits: number;
  onOpenMobileMenu: () => void;
  onOpenCommand: () => void;
}

export function WorkspaceHeader({ user, credits, onOpenMobileMenu, onOpenCommand }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = (user.name ?? user.email ?? 'S').trim().charAt(0).toUpperCase();
  const { canInstall, isInstalled, openSheet } = useInstallPwa();

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 flex items-center gap-3 px-4 lg:px-6 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-border">
      <button
        onClick={onOpenMobileMenu}
        className="lg:hidden w-9 h-9 rounded-lg hover:bg-surface flex items-center justify-center text-text-muted"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Center: search / command bar trigger */}
      <div className="flex-1 min-w-0 flex justify-center">
        <button
          onClick={onOpenCommand}
          className="hidden sm:flex items-center gap-2.5 w-full max-w-md h-10 px-3.5 rounded-xl border border-border bg-surface/60 hover:bg-surface text-left transition-colors"
        >
          <Search className="w-4 h-4 text-text-subtle shrink-0" />
          <span className="text-sm text-text-subtle flex-1">Search tools, downloads, settings…</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white dark:bg-card border border-border-light text-[10px] font-semibold text-text-subtle">
            Ctrl K
          </kbd>
        </button>

        <button
          onClick={onOpenCommand}
          className="sm:hidden w-9 h-9 rounded-lg hover:bg-surface flex items-center justify-center text-text-muted"
          aria-label="Search"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Right: credits, install, theme, account — flush right */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href="/workspace/billing"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-light text-primary text-[13px] font-semibold hover:bg-primary/15 transition-colors"
          title="Your SavCredits balance"
        >
          <Coins className="w-3.5 h-3.5" />
          {credits.toLocaleString()}
        </Link>

        {!isInstalled && canInstall && (
          <button
            onClick={openSheet}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-text-muted text-[13px] font-semibold hover:text-text hover:border-primary/30 transition-colors"
            title="Install SavDown"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
        )}

        <ThemeToggle variant="header" />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm hover:bg-primary/15 transition-colors overflow-hidden"
          >
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </button>

          {menuOpen && (
            <div
              className={cn(
                'absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-border bg-white dark:bg-card shadow-soft-lg py-2',
              )}
            >
              <div className="px-4 py-2 border-b border-border-light">
                <p className="text-sm font-semibold text-text truncate">{user.name ?? 'Your account'}</p>
                {user.email && <p className="text-xs text-text-muted truncate">{user.email}</p>}
              </div>
              <Link
                href="/workspace/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-muted hover:text-text hover:bg-surface transition-colors"
              >
                <UserIcon className="w-4 h-4" /> Profile
              </Link>
              <Link
                href="/workspace/billing"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-muted hover:text-text hover:bg-surface transition-colors"
              >
                <Settings className="w-4 h-4" /> Billing &amp; Credits
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
