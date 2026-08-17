'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard unavailable — the link is still visible and selectable.
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="flex-1 truncate rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text">
        {link}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy referral link"
        className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-white dark:bg-card text-text-muted transition-colors hover:border-primary/30 hover:text-primary"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
