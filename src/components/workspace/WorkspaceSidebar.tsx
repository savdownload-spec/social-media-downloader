'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toolGroups, groupSlug } from '@/config/catalog';
import {
  Home,
  DownloadCloud,
  History,
  FolderOpen,
  Layers,
  ListChecks,
  Download,
  Image as ImageIcon,
  Video,
  FileText,
  Sparkles,
  Search,
  Wrench,
  CreditCard,
  Settings,
  ChevronLeft,
  ExternalLink,
  LifeBuoy,
  X,
} from 'lucide-react';
import { OPEN_SUPPORT_EVENT } from '@/components/support/SupportChat';

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: 'soon';
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const GROUP_ICON: Record<(typeof toolGroups)[number], typeof Home> = {
  Downloaders: Download,
  Image: ImageIcon,
  Video: Video,
  PDF: FileText,
  AI: Sparkles,
  SEO: Search,
  Utility: Wrench,
};

const NAV_GROUPS: NavGroup[] = [
  {
    section: 'Workspace',
    items: [
      { label: 'Home', href: '/workspace', icon: Home },
      { label: 'Downloads', href: '/workspace/downloads', icon: DownloadCloud },
      { label: 'Activity', href: '/workspace/activity', icon: History },
      { label: 'My Files', href: '/workspace/files', icon: FolderOpen, badge: 'soon' },
      { label: 'Collections', href: '/workspace/collections', icon: Layers, badge: 'soon' },
      { label: 'Batch', href: '/workspace/batch', icon: ListChecks, badge: 'soon' },
    ],
  },
  {
    section: 'Tools',
    items: [
      { label: 'All Tools', href: '/workspace/tools', icon: Wrench },
      ...toolGroups.map((group) => ({
        label: group,
        href: `/workspace/tools/${groupSlug(group)}`,
        icon: GROUP_ICON[group],
      })),
    ],
  },
  {
    section: 'Account',
    items: [
      { label: 'Credits & Billing', href: '/account/billing', icon: CreditCard },
      { label: 'Profile & Settings', href: '/account', icon: Settings },
    ],
  },
];

interface Props {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function WorkspaceSidebar({ onClose, collapsed, onToggleCollapse }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    const path = href.split('#')[0];
    if (path === '/workspace') return pathname === '/workspace';
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white dark:bg-card border-r border-border shrink-0 transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-border shrink-0',
          collapsed ? 'justify-center px-2' : 'justify-between px-5',
        )}
      >
        <Link href="/workspace" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-text tracking-tight whitespace-nowrap">
              SavDown <span className="text-primary">Workspace</span>
            </span>
          )}
        </Link>
        {onClose && !collapsed && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-surface text-text-muted transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-4 space-y-5', collapsed ? 'px-2' : 'px-3')}>
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold text-text-subtle uppercase tracking-[0.1em]">
                {group.section}
              </p>
            )}
            {collapsed && <div className="w-full h-px bg-border-light mb-2 mt-1" />}
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
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] shrink-0 transition-colors',
                        active ? 'text-primary' : 'text-text-subtle group-hover:text-text-muted',
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="truncate">{label}</span>
                        {badge === 'soon' && (
                          <span className="ml-auto text-[9px] font-bold uppercase tracking-wide bg-surface text-text-subtle border border-border-light rounded-full px-1.5 py-0.5">
                            Soon
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
      <div className={cn('border-t border-border shrink-0', collapsed ? 'p-2' : 'px-3 py-3')}>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              'hidden lg:flex items-center gap-2 w-full rounded-xl text-[13px] font-medium text-text-muted hover:text-text hover:bg-surface/80 transition-all duration-150 mb-1',
              collapsed ? 'justify-center p-2.5' : 'px-3 py-2',
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={cn(
                'w-[18px] h-[18px] shrink-0 transition-transform duration-300',
                collapsed && 'rotate-180',
              )}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_EVENT));
            onClose?.();
          }}
          className={cn(
            'flex items-center gap-2 w-full rounded-xl text-[13px] font-medium text-text-muted hover:text-text hover:bg-surface/80 transition-all duration-150',
            collapsed ? 'justify-center p-2.5' : 'px-3 py-2',
          )}
          title={collapsed ? 'Support' : undefined}
        >
          <LifeBuoy className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Support</span>}
        </button>
        <Link
          href="/"
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
