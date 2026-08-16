'use client';

import Link from 'next/link';
import { useInstallPwa } from '@/components/pwa/InstallProvider';

type AppLink = {
  key: string;
  label: string;
  sublabel: string;
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
    { key: 'workspace', label: 'SavDown Web App', sublabel: 'Open SavDown Workspace →', href: '/workspace' },
  ];

  if (isInstalled) {
    apps.push({ key: 'install', label: 'SavDown is installed', sublabel: 'Open it →', href: '/workspace' });
  } else if (canInstall) {
    apps.push({ key: 'install', label: 'Install SavDown', sublabel: 'Install SavDown on your device →', onClick: openSheet });
  }
  // Neither installed nor installable (e.g. desktop Firefox): omit the row
  // entirely rather than show a button that can't do anything.

  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Our Apps</h3>
      <ul className="mt-4 space-y-2.5">
        {apps.map((app) =>
          app.href ? (
            <li key={app.key}>
              <Link
                href={app.href}
                className="text-[13px] text-ink-muted hover:text-white transition-colors leading-snug block"
              >
                <span className="block font-medium text-white/90">{app.label}</span>
                <span>{app.sublabel}</span>
              </Link>
            </li>
          ) : (
            <li key={app.key}>
              <button
                type="button"
                onClick={app.onClick}
                className="text-left text-[13px] text-ink-muted hover:text-white transition-colors leading-snug block"
              >
                <span className="block font-medium text-white/90">{app.label}</span>
                <span>{app.sublabel}</span>
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
