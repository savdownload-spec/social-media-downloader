'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu, Search, Bell, ChevronDown, LogOut, User, Settings,
  ChevronRight, PanelLeftClose, PanelLeftOpen, X,
  Users as UsersIcon, Wrench, FileText, CreditCard, Star,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'Users',
  '/admin/reviews': 'Reviews',
  '/admin/support': 'Support',
  '/admin/tools': 'Tools',
  '/admin/usage': 'Usage',
  '/admin/credits': 'Credits',
  '/admin/subscriptions': 'Subscriptions',
  '/admin/payments': 'Payments',
  '/admin/pricing': 'Pricing',
  '/admin/affiliates': 'Affiliates',
  '/admin/content': 'Content',
  '/admin/reports': 'Reports',
  '/admin/audit': 'Audit Log',
  '/admin/settings': 'Settings',
};

interface SearchResult {
  type: 'user' | 'tool' | 'review' | 'content' | 'page';
  label: string;
  href: string;
  sub?: string;
}

const QUICK_LINKS: SearchResult[] = [
  { type: 'page', label: 'Dashboard', href: '/admin', sub: 'Overview' },
  { type: 'page', label: 'Users', href: '/admin/users', sub: 'User Management' },
  { type: 'page', label: 'Reviews', href: '/admin/reviews', sub: 'User Management' },
  { type: 'page', label: 'Tools', href: '/admin/tools', sub: 'Product' },
  { type: 'page', label: 'Content', href: '/admin/content', sub: 'Content Management' },
  { type: 'page', label: 'Settings', href: '/admin/settings', sub: 'System' },
  { type: 'page', label: 'Pricing', href: '/admin/pricing', sub: 'Billing' },
  { type: 'page', label: 'Subscriptions', href: '/admin/subscriptions', sub: 'Billing' },
  { type: 'page', label: 'Payments', href: '/admin/payments', sub: 'Billing' },
  { type: 'page', label: 'Credits', href: '/admin/credits', sub: 'Product' },
  { type: 'page', label: 'Usage', href: '/admin/usage', sub: 'Product' },
  { type: 'page', label: 'Reports', href: '/admin/reports', sub: 'Analytics' },
  { type: 'page', label: 'Audit Log', href: '/admin/audit', sub: 'System' },
  { type: 'page', label: 'Affiliates', href: '/admin/affiliates', sub: 'Growth' },
  { type: 'page', label: 'Support', href: '/admin/support', sub: 'User Management' },
];

const SEARCH_ICONS = {
  user: UsersIcon,
  tool: Wrench,
  review: Star,
  content: FileText,
  page: CreditCard,
};

interface Props {
  onMenuClick: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminHeader({ onMenuClick, collapsed, onToggleCollapse }: Props) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  const pageTitle = PAGE_TITLES[pathname] || (pathname.startsWith('/admin/users/') ? 'User Details' : '');

  const segments = pathname.split('/').filter(Boolean).slice(1);
  const breadcrumbs = [
    { label: 'Admin', href: '/admin' },
    ...segments.map((seg, i) => ({
      label: PAGE_TITLES['/admin/' + seg] || (pathname.startsWith('/admin/users/') && i === 1 ? 'Details' : seg),
      href: i === segments.length - 1 ? undefined : '/admin/' + segments.slice(0, i + 1).join('/'),
    })),
  ];

  const filteredResults = searchQuery.trim()
    ? QUICK_LINKS.filter((l) =>
        l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.sub && l.sub.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : QUICK_LINKS.slice(0, 6);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchSelect = useCallback((href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  }, [router]);

  return (
    <>
      <header className="h-14 bg-white border-b border-border flex items-center gap-2 px-4 lg:px-5 shrink-0">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-surface text-text-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-2 rounded-lg hover:bg-surface text-text-muted transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-1 text-[13px] min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="w-3 h-3 text-text-subtle shrink-0" />}
              {crumb.href ? (
                <Link href={crumb.href} className="text-text-muted hover:text-primary transition-colors truncate">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-text font-medium truncate">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Mobile page title */}
        <span className="md:hidden text-sm font-semibold text-text truncate">{pageTitle}</span>

        <div className="flex-1" />

        {/* Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-surface/50 text-text-subtle hover:text-text-muted hover:border-border/80 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-text-subtle bg-white border border-border rounded px-1.5 py-0.5 font-mono">
            <span className="text-[9px]">&#8984;</span>K
          </kbd>
        </button>

        {/* Notifications */}
        <Link
          href="/admin/reviews"
          className="relative p-2 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </Link>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-lg hover:bg-surface transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-bold">
              {initials}
            </div>
            <ChevronDown className={cn(
              'w-3 h-3 text-text-subtle transition-transform hidden sm:block',
              profileOpen && 'rotate-180',
            )} />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-border rounded-xl shadow-soft-lg z-20 py-1">
                <div className="px-4 py-2.5 border-b border-border-light">
                  <p className="text-xs font-semibold text-text truncate">{session?.user?.name}</p>
                  <p className="text-[11px] text-text-muted truncate">{session?.user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-muted hover:text-text hover:bg-surface transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </Link>
                  <Link
                    href="/"
                    target="_blank"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-muted hover:text-text hover:bg-surface transition-colors"
                  >
                    <User className="w-3.5 h-3.5" /> View site
                  </Link>
                </div>
                <div className="border-t border-border-light pt-1">
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Command palette / Global search */}
      {searchOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
          />
          <div
            ref={searchRef}
            className="fixed z-50 top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border border-border rounded-2xl shadow-soft-xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 h-12 border-b border-border-light">
              <Search className="w-4 h-4 text-text-subtle shrink-0" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, users, tools..."
                className="flex-1 text-sm text-text placeholder:text-text-subtle bg-transparent border-0 outline-none"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="p-1 rounded hover:bg-surface text-text-subtle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto py-2">
              {filteredResults.length === 0 ? (
                <p className="px-4 py-6 text-sm text-text-muted text-center">No results found</p>
              ) : (
                <>
                  <p className="px-4 py-1 text-[10px] font-semibold text-text-subtle uppercase tracking-wider">
                    {searchQuery ? 'Results' : 'Quick navigation'}
                  </p>
                  {filteredResults.map((result) => {
                    const Icon = SEARCH_ICONS[result.type] || CreditCard;
                    return (
                      <button
                        key={result.href}
                        onClick={() => handleSearchSelect(result.href)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-surface transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text truncate">{result.label}</p>
                          {result.sub && (
                            <p className="text-[11px] text-text-muted truncate">{result.sub}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
            <div className="border-t border-border-light px-4 py-2 flex items-center gap-4 text-[10px] text-text-subtle">
              <span><kbd className="bg-surface px-1 py-0.5 rounded text-[9px] font-mono border border-border">&#8593;&#8595;</kbd> Navigate</span>
              <span><kbd className="bg-surface px-1 py-0.5 rounded text-[9px] font-mono border border-border">&#9166;</kbd> Open</span>
              <span><kbd className="bg-surface px-1 py-0.5 rounded text-[9px] font-mono border border-border">Esc</kbd> Close</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
