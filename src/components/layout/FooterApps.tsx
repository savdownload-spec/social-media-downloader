'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Monitor, Download, Check } from 'lucide-react';
import { useInstallPwa } from '@/components/pwa/InstallProvider';

type AppBadge = {
  key: string;
  icon: LucideIcon;
  label: string;
  title: string;
  href?: string;
  onClick?: () => void;
  /** Force a real browser navigation instead of Next's client-side router.
   *  Only a genuine navigation event is something the OS/browser can hand
   *  off to the installed PWA (Windows "Open supported links in this app",
   *  Android app links) -- client-side routing never leaves the page, so it
   *  can never trigger that handoff even when the app is installed. */
  external?: boolean;
};

/**
 * "Our Apps" footer badges. Compact pill buttons rather than text rows, so a
 * future SavDown Desktop/Mobile entry is a one-line addition here -- nothing
 * is rendered for an app that doesn't exist yet.
 */
export function FooterApps() {
  const { canInstall, isInstalled, openSheet } = useInstallPwa();

  const apps: AppBadge[] = [
    { key: 'workspace', icon: Monitor, label: 'Web app', title: 'Open the SavDown web app', href: '/workspace' },
  ];

  if (isInstalled) {
    apps.push({ key: 'install', icon: Check, label: 'Installed', title: 'Open the installed SavDown app', href: '/workspace', external: true });
  } else if (canInstall) {
    apps.push({ key: 'install', icon: Download, label: 'Install app', title: 'Install SavDown on your device', onClick: openSheet });
  }
  // Neither installed nor installable (e.g. desktop Firefox): omit the badge
  // entirely rather than show a button that can't do anything.

  const badgeClass =
    'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15 hover:border-white/20';

  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Our Apps</h3>
      <div className="mt-4 flex flex-col items-start gap-2">
        {apps.map((app) => {
          const Icon = app.icon;
          if (!app.href) {
            return (
              <button key={app.key} type="button" onClick={app.onClick} title={app.title} className={badgeClass}>
                <Icon className="h-3.5 w-3.5" />
                {app.label}
              </button>
            );
          }
          if (app.external) {
            return (
              <a key={app.key} href={app.href} target="_blank" rel="noopener noreferrer" title={app.title} className={badgeClass}>
                <Icon className="h-3.5 w-3.5" />
                {app.label}
              </a>
            );
          }
          return (
            <Link key={app.key} href={app.href} title={app.title} className={badgeClass}>
              <Icon className="h-3.5 w-3.5" />
              {app.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
