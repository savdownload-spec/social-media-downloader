'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceMobileNav } from './WorkspaceMobileNav';
import { CommandBar } from './CommandBar';
import { SupportChat } from '@/components/support/SupportChat';

type WorkspaceUser = { name: string | null; email: string | null; image: string | null };

interface Props {
  children: React.ReactNode;
  user: WorkspaceUser;
  credits: number;
}

const COLLAPSE_KEY = 'savdown-workspace-sidebar-collapsed';

export function WorkspaceShell({ children, user, credits }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === 'true') setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col h-screen sticky top-0">
        <WorkspaceSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex flex-col lg:hidden animate-slide-in">
            <WorkspaceSidebar onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <WorkspaceHeader
          user={user}
          credits={credits}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
        />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      <WorkspaceMobileNav />
      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} />
      <SupportChat />
    </div>
  );
}
