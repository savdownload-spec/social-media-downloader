'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { AppWindow, Download, CheckCircle2 } from 'lucide-react';
import { useInstallPwa } from '@/components/pwa/InstallProvider';

type AppLink = {
  key: string;
  icon: LucideIcon;
  label: string;
  sublabel: string;
  title: string;
  href?: string;
  onClick?: () => void;
};

/**
 * "Our Apps" footer column. Built as a small reusable list so a future
 * SavDown Desktop/Mobile entry is a one-line addition here — nothing is
 * rendered for an app that doesn't exist yet.
 */
export function FooterApps() {
  const { canInstall, isInstalled, openSheet } = useInstallPwa();

  const apps: AppLink[] = [
    {
      key: 'workspace',
      icon: AppWindow,
      label: 'SavDown Web App',
      sublabel: 'Open SavDown Workspace',
      title: 'Open the SavDown web app',
      href: '/workspace',
    },
  ];

  if (isInstalled) {
    apps.push({
      key: 'install',
      icon: CheckCircle2,
      label: 'SavDown is installed',
      sublabel: 'Open it',
      title: 'Open the installed SavDown app',
      href: '/workspace',
    });
  } else if (canInstall) {
    apps.push({
      key: 'install',
      icon: Download,
      label: 'Install SavDown',
      sublabel: 'Add to your device',
      title: 'Install SavDown on your device',
      onClick: openSheet,
    });
  }
  // Neither installed nor installable (e.g. desktop Firefox): omit the row
  // entirely rather than show a button that can't do anything.

  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Our Apps</h3>
      <ul className="mt-4 space-y-2.5">
        {apps.map((app) => {
          const Icon = app.icon;
          const content = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/80 transition-colors group-hover:border-white/20 group-hover:text-white">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-white/90 leading-snug">{app.label}</span>
                <span className="block text-[12px] text-ink-muted leading-snug">{app.sublabel} →</span>
              </span>
            </>
          );

          return (
            <li key={app.key}>
              {app.href ? (
                <Link
                  href={app.href}
                  title={app.title}
                  className="group flex items-center gap-3 text-ink-muted hover:text-white transition-colors"
                >
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={app.onClick}
                  title={app.title}
                  className="group flex w-full items-center gap-3 text-left text-ink-muted hover:text-white transition-colors"
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
