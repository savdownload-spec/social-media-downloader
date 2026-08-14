'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface Props {
  children: React.ReactNode;
  title?: string;
}

export function AdminShell({ children, title }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const adminLabels: Record<string, string> = { users: 'Users', content: 'Content', analytics: 'Analytics', settings: 'Settings', billing: 'Billing', audit: 'Audit Log' };
  const segments = pathname.split('/').filter(Boolean).slice(1);
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin', href: '/admin' },
    ...segments.map((segment, index) => ({
      label: adminLabels[segment] ?? (pathname.startsWith('/admin/users/') ? 'User Details' : segment),
      href: index === segments.length - 1 ? undefined : '/admin/' + segments.slice(0, index + 1).join('/'),
    })),
  ];

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
          {segments.length > 0 && (
            <div className="border-b border-border-light bg-white/70 px-4 py-4 sm:px-6">
              <Breadcrumb
                className="justify-start px-0"
                includeSchema
                items={breadcrumbItems}
              />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}



