'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Menu, Search, Bell, ChevronDown, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  onMenuClick: () => void;
  title?: string;
}

export function AdminHeader({ onMenuClick, title }: Props) {
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    <header className="h-16 bg-white border-b border-border flex items-center gap-4 px-4 lg:px-6 shrink-0">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl hover:bg-surface text-text-muted"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      {title && (
        <h1 className="hidden sm:block text-sm font-semibold text-text truncate">{title}</h1>
      )}

      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        {searchOpen ? (
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
            placeholder="Search users, tools, transactions…"
            className="w-72 h-9 pl-9 pr-4 rounded-xl border border-border bg-surface text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-primary/50 transition-all"
          />
        ) : null}
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 text-text-subtle hover:text-primary transition-colors',
            !searchOpen && 'relative left-0 top-0 translate-y-0 p-2 rounded-xl hover:bg-surface',
          )}
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Notifications */}
      <Link href="/admin/reviews" className="relative p-2 rounded-xl hover:bg-surface text-text-muted hover:text-text transition-colors">
        <Bell className="w-4 h-4" />
      </Link>

      {/* Profile dropdown */}
      <div className="relative">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-xl hover:bg-surface transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <span className="hidden sm:block text-sm font-medium text-text max-w-[120px] truncate">
            {session?.user?.name ?? session?.user?.email ?? 'Admin'}
          </span>
          <ChevronDown className={cn('w-3.5 h-3.5 text-text-subtle transition-transform', profileOpen && 'rotate-180')} />
        </button>

        {profileOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-border rounded-2xl shadow-soft-lg z-20 py-1.5">
              <div className="px-4 py-2 border-b border-border mb-1">
                <p className="text-xs font-semibold text-text truncate">{session?.user?.name}</p>
                <p className="text-xs text-text-muted truncate">{session?.user?.email}</p>
              </div>
              <Link
                href="/admin/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text hover:bg-surface transition-colors"
              >
                <User className="w-3.5 h-3.5" /> Profile settings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
