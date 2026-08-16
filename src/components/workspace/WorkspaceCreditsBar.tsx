import { Coins } from 'lucide-react';
import type { BillingSummary } from '@/lib/billing';
import { formatDate } from '@/lib/utils';
import { SecondaryCTA } from './CTAButtons';

const PLAN_LABEL: Record<BillingSummary['plan'], string> = {
  FREE: 'Free plan',
  PRO: 'Pro plan',
  LIFETIME: 'Lifetime plan',
};

/** Full-width credits/plan status bar — the Home page's Credits & Usage summary. */
export function WorkspaceCreditsBar({ billing }: { billing: BillingSummary }) {
  return (
    <div className="w-full rounded-2xl border border-border bg-white dark:bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">
          <Coins className="w-5 h-5" />
        </span>
        <div>
          <p className="text-2xl font-bold text-text leading-none">{billing.totalCredits.toLocaleString()}</p>
          <p className="text-xs text-text-muted mt-1">SavCredits available</p>
        </div>
      </div>

      <div className="hidden sm:block h-10 w-px bg-border-light" />

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-text-subtle">Plan</p>
        <p className="text-sm font-semibold text-text mt-1">{PLAN_LABEL[billing.plan]}</p>
      </div>

      {billing.planCreditsResetAt && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-subtle">Refills</p>
          <p className="text-sm font-semibold text-text mt-1">{formatDate(billing.planCreditsResetAt)}</p>
        </div>
      )}

      <div className="sm:ml-auto">
        <SecondaryCTA href="/workspace/billing">Manage Credits & Billing</SecondaryCTA>
      </div>
    </div>
  );
}
