'use client';

import { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface Props {
  children: React.ReactNode;
  title?: string;
}

export function AdminShell({ children, title }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F7FB] flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col h-screen sticky top-0">
        <AdminSidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex flex-col lg:hidden">
            <AdminSidebar onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onMenuClick={() => setMobileOpen(true)} title={title} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
