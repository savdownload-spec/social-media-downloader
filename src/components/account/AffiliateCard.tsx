import Link from 'next/link';
import { Share2 } from 'lucide-react';
import { CopyReferralLink } from './CopyReferralLink';

export type AccountAffiliate = { code: string; status: string; totalSignups: number } | null;

/** Mirrors BillingCard's layout so the two sidebar panels read as a set. */
export function AffiliateCard({ affiliate, siteUrl }: { affiliate: AccountAffiliate; siteUrl: string }) {
  if (!affiliate) {
    return (
      <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 flex-shrink-0 text-primary" />
          <h2 className="text-sm font-semibold text-text">Affiliate program</h2>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Earn commission by sharing SavDown with your audience.
        </p>
        <Link
          href="/affiliates"
          className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-border bg-white dark:bg-card px-5 py-2.5 text-sm font-semibold text-text transition-all hover:border-primary/40 hover:bg-primary-light"
        >
          Learn more
        </Link>
      </div>
    );
  }

  const referralLink = `${siteUrl}/?ref=${affiliate.code}`;

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 flex-shrink-0 text-primary" />
        <h2 className="text-sm font-semibold text-text">Affiliate program</h2>
      </div>

      {affiliate.status === 'ACTIVE' && (
        <>
          <p className="mt-2 text-sm text-text-muted">Your referral link:</p>
          <CopyReferralLink link={referralLink} />
          <p className="mt-3 text-xs text-text-subtle">
            {affiliate.totalSignups} {affiliate.totalSignups === 1 ? 'signup' : 'signups'} so far.
          </p>
        </>
      )}

      {affiliate.status === 'PENDING' && (
        <p className="mt-2 text-sm text-text-muted">
          Your application is under review — we&apos;ll let you know once it&apos;s approved.
        </p>
      )}

      {affiliate.status === 'SUSPENDED' && (
        <p className="mt-2 text-sm text-text-muted">
          Your affiliate account is currently suspended.{' '}
          <Link href="/contact" className="font-semibold text-primary hover:text-primary-hover underline underline-offset-4">
            Contact support
          </Link>{' '}
          for details.
        </p>
      )}
    </div>
  );
}
