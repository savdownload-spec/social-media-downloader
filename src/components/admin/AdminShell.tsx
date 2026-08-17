'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface Props {
  children: React.ReactNode;
}

const COLLAPSE_KEY = 'savdown-admin-sidebar-collapsed';

export function AdminShell({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === 'true') setCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch {}
      return next;
    });
  }

  return (
    <div className="admin-panel min-h-screen bg-[#F7F7FB] flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col h-screen sticky top-0">
        <AdminSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex flex-col lg:hidden animate-slide-in">
            <AdminSidebar onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          onMenuClick={() => setMobileOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
        {/*
          No overflow-auto here. This root is min-h-screen (not h-screen), so
          this <main> never actually gets a bounded height to scroll within —
          the window scrolls instead, matching the sticky sidebar above. But
          `overflow: auto` alone (regardless of whether it ever overflows)
          makes the browser treat this element as the nearest scrolling
          ancestor for CSS position: sticky, silently breaking every sticky
          element on every admin page (edit toolbars, sticky headers, etc.)
          since its own scrollTop never moves.
        */}
        <main className="flex-1">{children}</main>

        {/* Admin footer */}
        <footer className="border-t border-border-light bg-white/60 px-6 py-3">
          <div className="flex items-center justify-between text-[11px] text-text-subtle">
            <span>&copy; {new Date().getFullYear()} SavDown</span>
            <span>Admin Panel</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
