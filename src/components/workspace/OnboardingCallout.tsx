'use client';

import { useEffect, useState } from 'react';
import { Link2, Zap, Sparkles, DownloadCloud, X } from 'lucide-react';

const STORAGE_KEY = 'savdown:workspace:onboardingDismissed';

const STEPS = [
  { icon: Link2, label: 'Paste or upload', desc: 'Drop a link or a file into the box above.' },
  { icon: Zap, label: 'Choose an action', desc: "SavDown detects the right tool automatically." },
  { icon: Sparkles, label: 'Process', desc: 'Run the tool — conversion, download, or edit.' },
  { icon: DownloadCloud, label: 'Save & download', desc: 'Grab your file, ready to use.' },
];

export function OnboardingCallout() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  if (dismissed) return null;

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-border-light bg-white/60 dark:bg-card/60 p-5 relative">
      <button
        onClick={dismiss}
        aria-label="Skip onboarding"
        className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-surface flex items-center justify-center text-text-subtle transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle mb-4">How SavDown Workspace works</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-bold text-text-subtle">{i + 1}</span>
              </div>
              <p className="text-[13px] font-semibold text-text">{step.label}</p>
              <p className="text-xs text-text-muted leading-snug">{step.desc}</p>
            </div>
          );
        })}
      </div>
      <button
        onClick={dismiss}
        className="mt-4 text-xs font-semibold text-primary hover:underline"
      >
        Skip
      </button>
    </div>
  );
}
