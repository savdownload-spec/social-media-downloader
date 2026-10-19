import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Coins, Share2, Users, UserCheck, Gift } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { expireReferralRewards, getAffiliateReferralSummary, referralRewardStatus } from '@/lib/affiliates';
import { siteConfig } from '@/config/site';
import { CopyReferralLink } from '@/components/account/CopyReferralLink';
import { WorkspaceContainer } from '@/components/workspace/WorkspaceContainer';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Affiliate Program',
  description: 'Track your SavDown referrals and SavCredits rewards.',
  path: '/workspace/affiliate',
  noIndex: true,
});
export const dynamic = 'force-dynamic';

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString('en', { dateStyle: 'medium', timeZone: 'UTC' }) : '—';
}

function attributionLabel(status: string) {
  if (status === 'QUALIFIED') return 'Qualified';
  if (status === 'PENDING') return 'Pending verification';
  return 'Rejected';
}

function rewardLabel(referral: {
  status: string;
  remainingCredits: number;
  expiredCredits: number;
  expiresAt: Date | null;
}) {
  const status = referralRewardStatus(referral);
  if (status === 'ACTIVE') return 'Active';
  if (status === 'EXPIRED') return 'Expired';
  if (status === 'USED') return 'Used';
  if (status === 'PENDING') return 'Pending';
  return 'Not awarded';
}

function Metric({ label, value, note, icon: Icon }: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Coins;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-card p-5 shadow-soft">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-text-muted">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </p>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-text">{value}</p>
      <p className="mt-1 text-xs text-text-subtle">{note}</p>
    </div>
  );
}

export default async function WorkspaceAffiliatePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/workspace/affiliate');

  await expireReferralRewards(session.user.id);
  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      code: true,
      status: true,
      referrals: {
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          code: true,
          status: true,
          rejectionReason: true,
          rewardCredits: true,
          remainingCredits: true,
          expiredCredits: true,
          createdAt: true,
          qualifiedAt: true,
          rewardedAt: true,
          expiresAt: true,
        },
      },
    },
  });
  const summary = affiliate
    ? await getAffiliateReferralSummary(affiliate.id)
    : { signups: 0, legacySignups: 0, qualifyingReferrals: 0, rewardsIssued: 0, activeRewardCredits: 0, expiredRewardCredits: 0 };
  const referralLink = affiliate?.status === 'ACTIVE'
    ? `${siteConfig.url.replace(/\/$/, '')}/r/${encodeURIComponent(affiliate.code)}`
    : null;
  const activeRewards = affiliate?.referrals.filter((referral) =>
    referral.status === 'QUALIFIED' && referral.remainingCredits > 0 && referral.expiresAt && referral.expiresAt > new Date(),
  ) ?? [];

  return (
    <WorkspaceContainer>
      <WorkspacePageHeader title="Affiliate Program" description="Track referred sign-ups and SavCredits rewards." />

      <div className="rounded-2xl border border-primary/15 bg-primary-light/60 px-5 py-4 text-sm leading-6 text-text">
        Earn 20 SavCredits for each qualifying new user you refer. Referral reward credits expire after one month.
      </div>

      {!affiliate ? (
        <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
          <div className="flex items-start gap-3">
            <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-text">Join the affiliate program</h2>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                Apply to receive a referral link. Once an administrator approves your application, you can share it and track eligible sign-ups here.
              </p>
              <Link href="/affiliates" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
                View Program Details
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {affiliate.status === 'ACTIVE' && referralLink ? (
            <section className="rounded-2xl border border-border bg-white dark:bg-card p-5 shadow-soft" aria-label="Your referral link">
              <div className="flex items-center gap-2 text-sm font-semibold text-text">
                <Share2 className="h-4 w-4 text-primary" /> Your referral link
              </div>
              <CopyReferralLink link={referralLink} />
            </section>
          ) : (
            <div className="rounded-2xl border border-border bg-white dark:bg-card p-5 text-sm text-text-muted shadow-soft">
              {affiliate.status === 'PENDING'
                ? 'Your affiliate application is under review. Your referral link will appear here after approval.'
                : 'Your affiliate account is suspended. Contact support if you need help.'}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Referred sign-ups" value={summary.signups.toLocaleString()} note={summary.legacySignups > 0 ? `${summary.legacySignups.toLocaleString()} historical aggregate sign-ups retained` : 'New accounts attributed to your link'} icon={Users} />
            <Metric label="Qualifying referrals" value={summary.qualifyingReferrals.toLocaleString()} note="Eligible new users" icon={UserCheck} />
            <Metric label="SavCredits earned" value={summary.rewardsIssued.toLocaleString()} note="Referral rewards issued" icon={Coins} />
            <Metric label="Active reward credits" value={summary.activeRewardCredits.toLocaleString()} note={`${summary.expiredRewardCredits.toLocaleString()} unused credits expired`} icon={Gift} />
          </div>

          {activeRewards.length > 0 && (
            <section className="rounded-2xl border border-border bg-white dark:bg-card p-5 shadow-soft">
              <h2 className="text-sm font-semibold text-text">Active referral rewards</h2>
              <ul className="mt-3 divide-y divide-border-light">
                {activeRewards.map((reward) => (
                  <li key={reward.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span className="font-medium text-text">{reward.remainingCredits} SavCredits</span>
                    <span className="text-text-muted">Expires {formatDate(reward.expiresAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-border bg-white dark:bg-card shadow-soft">
            <div className="border-b border-border-light px-5 py-4">
              <h2 className="text-sm font-semibold text-text">Referral history</h2>
              <p className="mt-1 text-xs text-text-subtle">Sign-ups are recorded separately from paid conversions. This program does not report cash earnings.</p>
            </div>
            {affiliate.referrals.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-text-muted">{summary.legacySignups > 0 ? 'No per-user referral records are available yet. Historical aggregate sign-ups are included in your totals above; individual records and rewards could not be reconstructed.' : 'No referred sign-ups yet.'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-surface/60 text-[11px] uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Referral date</th>
                      <th className="px-5 py-3 font-semibold">Attribution status</th>
                      <th className="px-5 py-3 font-semibold">Reward status</th>
                      <th className="px-5 py-3 text-right font-semibold">Reward</th>
                      <th className="px-5 py-3 text-right font-semibold">Expiry date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affiliate.referrals.map((referral) => (
                      <tr key={referral.id} className="border-t border-border-light">
                        <td className="px-5 py-3 text-text">{formatDate(referral.createdAt)}</td>
                        <td className="px-5 py-3 text-text-muted">{attributionLabel(referral.status)}</td>
                        <td className="px-5 py-3 text-text-muted">{rewardLabel(referral)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-text">
                          {referral.rewardCredits ? `${referral.rewardCredits} SavCredits` : '—'}
                        </td>
                        <td className="px-5 py-3 text-right text-text-muted">{formatDate(referral.expiresAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </WorkspaceContainer>
  );
}
