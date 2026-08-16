'use client';

import Link from 'next/link';
import { Coins, DownloadCloud, History, LifeBuoy, ArrowRight } from 'lucide-react';
import { catalog, groupSlug } from '@/config/catalog';
import type { BillingSummary } from '@/lib/billing';
import { formatDate } from '@/lib/utils';
import { OPEN_SUPPORT_EVENT } from '@/components/support/SupportChat';

const PLAN_LABEL: Record<BillingSummary['plan'], string> = {
  FREE: 'Free plan',
  PRO: 'Pro plan',
  LIFETIME: 'Lifetime plan',
};

/** First entries of the master catalog — its declared order is already the curated
 *  "most worth seeing first" list (see the doc comment on `catalog` in config/catalog.ts). */
const POPULAR_TOOLS = catalog.slice(0, 6);

export function WorkspaceHomeSidebar({ billing }: { billing: BillingSummary }) {
  return (
    <aside className="space-y-4">
      {/* Credits & usage */}
      <div className="p-5 rounded-2xl border border-border bg-white dark:bg-card">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-text">Credits & Usage</h3>
          <span className="text-[10px] font-bold uppercase tracking-wide bg-primary-light text-primary rounded-full px-2 py-0.5">
            {PLAN_LABEL[billing.plan]}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4" />
          </span>
          <div>
            <p className="text-xl font-bold text-text leading-none">{billing.totalCredits.toLocaleString()}</p>
            <p className="text-xs text-text-muted mt-1">SavCredits available</p>
          </div>
        </div>
        {billing.planCreditsResetAt && (
          <p className="mt-3 text-xs text-text-subtle">
            Plan credits refill {formatDate(billing.planCreditsResetAt)}
          </p>
        )}
        <Link
          href="/workspace/billing"
          className="mt-4 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-surface hover:bg-primary-light text-text hover:text-primary text-[13px] font-semibold transition-colors"
        >
          Manage credits & billing
        </Link>
      </div>

      {/* Popular tools */}
      <div className="p-5 rounded-2xl border border-border bg-white dark:bg-card">
        <h3 className="text-[13px] font-bold text-text mb-3">Popular Tools</h3>
        <div className="space-y-0.5">
          {POPULAR_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.slug}
                href={`/workspace/tools/${groupSlug(tool.group)}/${tool.slug}`}
                className="group flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-surface transition-colors"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tool.tile}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium text-text truncate">{tool.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="p-2 rounded-2xl border border-border bg-white dark:bg-card">
        <Link
          href="/workspace/downloads"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors text-[13px] font-medium text-text"
        >
          <DownloadCloud className="w-4 h-4 text-text-subtle" /> Downloads
        </Link>
        <Link
          href="/workspace/activity"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors text-[13px] font-medium text-text"
        >
          <History className="w-4 h-4 text-text-subtle" /> Activity
        </Link>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_EVENT))}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors text-[13px] font-medium text-text"
        >
          <LifeBuoy className="w-4 h-4 text-text-subtle" /> Support
        </button>
      </div>
    </aside>
  );
}
