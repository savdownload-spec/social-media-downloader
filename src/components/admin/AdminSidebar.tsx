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
  Sparkles,
  CreditCard,
  DollarSign,
  Tag,
  Share2,
  FileText,
  Flag,
  Settings,
  ClipboardList,
  MessageCircle,
  MessageSquare,
  X,
  ShieldCheck,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    section: 'User Management',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Reviews', href: '/admin/reviews', icon: Star },
      { label: 'Support', href: '/admin/support', icon: MessageCircle },
    ],
  },
  {
    section: 'Product',
    items: [
      { label: 'Tools', href: '/admin/tools', icon: Wrench },
      { label: 'AI Image Generator', href: '/admin/ai-image', icon: Sparkles },
      { label: 'Usage', href: '/admin/usage', icon: BarChart3 },
      { label: 'Credits', href: '/admin/credits', icon: Coins },
    ],
  },
  {
    section: 'Billing',
    items: [
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { label: 'Payments', href: '/admin/payments', icon: DollarSign },
      { label: 'Pricing', href: '/admin/pricing', icon: Tag },
    ],
  },
  {
    section: 'Growth',
    items: [
      { label: 'Affiliates', href: '/admin/affiliates', icon: Share2 },
    ],
  },
  {
    section: 'Content',
    items: [
      { label: 'Content', href: '/admin/content', icon: FileText },
      { label: 'Comments', href: '/admin/comments', icon: MessageSquare },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { label: 'Reports', href: '/admin/reports', icon: Flag },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Audit Log', href: '/admin/audit', icon: ClipboardList },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

interface Props {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({ onClose, collapsed, onToggleCollapse }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-border shrink-0 transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-border shrink-0',
        collapsed ? 'justify-center px-2' : 'justify-between px-5',
      )}>
        <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-text tracking-tight whitespace-nowrap">
              SavDown <span className="text-primary">Admin</span>
            </span>
          )}
        </Link>
        {onClose && !collapsed && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-surface text-text-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        'flex-1 overflow-y-auto py-4 space-y-5',
        collapsed ? 'px-2' : 'px-3',
      )}>
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold text-text-subtle uppercase tracking-[0.1em]">
                {group.section}
              </p>
            )}
            {collapsed && (
              <div className="w-full h-px bg-border-light mb-2 mt-1" />
            )}
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon, badge }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    title={collapsed ? label : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-150',
                      collapsed ? 'justify-center p-2.5' : 'px-3 py-2',
                      active
                        ? 'bg-primary/[0.08] text-primary'
                        : 'text-text-muted hover:text-text hover:bg-surface/80',
                    )}
                  >
                    <Icon className={cn(
                      'w-[18px] h-[18px] shrink-0 transition-colors',
                      active ? 'text-primary' : 'text-text-subtle group-hover:text-text-muted',
                    )} />
                    {!collapsed && (
                      <>
                        <span className="truncate">{label}</span>
                        {badge !== undefined && badge > 0 && (
                          <span className="ml-auto text-[10px] font-bold bg-primary text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn(
        'border-t border-border shrink-0',
        collapsed ? 'p-2' : 'px-3 py-3',
      )}>
        {/* Collapse toggle (desktop only) */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              'hidden lg:flex items-center gap-2 w-full rounded-xl text-[13px] font-medium text-text-muted hover:text-text hover:bg-surface/80 transition-all duration-150 mb-1',
              collapsed ? 'justify-center p-2.5' : 'px-3 py-2',
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn(
              'w-[18px] h-[18px] shrink-0 transition-transform duration-300',
              collapsed && 'rotate-180',
            )} />
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
        <Link
          href="/"
          target="_blank"
          className={cn(
            'flex items-center gap-2 rounded-xl text-[13px] font-medium text-text-subtle hover:text-primary transition-colors',
            collapsed ? 'justify-center p-2.5' : 'px-3 py-2',
          )}
          title={collapsed ? 'Back to site' : undefined}
        >
          <ExternalLink className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Back to site</span>}
        </Link>
      </div>
    </aside>
  );
}
