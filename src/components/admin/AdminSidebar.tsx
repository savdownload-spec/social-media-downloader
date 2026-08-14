'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Star,
  Wrench,
  BarChart3,
  Coins,
  CreditCard,
  DollarSign,
  Tag,
  Share2,
  FileText,
  Flag,
  Settings,
  ClipboardList,
  MessageCircle,
  X,
  ShieldCheck,
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard',     href: '/admin',               icon: LayoutDashboard },
  { label: 'Users',         href: '/admin/users',          icon: Users },
  { label: 'Reviews',       href: '/admin/reviews',        icon: Star },
  { label: 'Support',       href: '/admin/support',        icon: MessageCircle },
  { label: 'Tools',         href: '/admin/tools',          icon: Wrench },
  { label: 'Usage',         href: '/admin/usage',          icon: BarChart3 },
  { label: 'Credits',       href: '/admin/credits',        icon: Coins },
  { label: 'Subscriptions', href: '/admin/subscriptions',  icon: CreditCard },
  { label: 'Payments',      href: '/admin/payments',       icon: DollarSign },
  { label: 'Pricing',       href: '/admin/pricing',        icon: Tag },
  { label: 'Affiliates',    href: '/admin/affiliates',     icon: Share2 },
  { label: 'Content',       href: '/admin/content',        icon: FileText },
  { label: 'Reports',       href: '/admin/reports',        icon: Flag },
  { label: 'Audit Log',     href: '/admin/audit',          icon: ClipboardList },
  { label: 'Settings',      href: '/admin/settings',       icon: Settings },
];

interface Props {
  onClose?: () => void;
}

export function AdminSidebar({ onClose }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex flex-col h-full bg-white border-r border-border w-64 shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-text tracking-tight">SavDown <span className="text-primary">Admin</span></span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-surface text-text-muted">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive(href)
                ? 'bg-primary-light text-primary'
                : 'text-text-muted hover:text-text hover:bg-surface',
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0', isActive(href) ? 'text-primary' : 'text-text-subtle')} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border shrink-0">
        <Link href="/" className="text-xs text-text-subtle hover:text-primary transition-colors">
          ← Back to site
        </Link>
      </div>
    </aside>
  );
}
