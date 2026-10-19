'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { Share2, Coins, MousePointerClick, Users, UserCheck, Gift, DollarSign } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterTab, EmptyState, ErrorState, Skeleton,
} from './AdminUI';
import { useToast } from '@/components/ui/Toast';

const STATUSES = ['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'];

type Affiliate = {
  id: string;
  code: string;
  status: string;
  totalClicks: number;
  totalSignups: number;
  qualifyingReferrals: number;
  rewardsIssued: number;
  activeRewardCredits: number;
  expiredRewardCredits: number;
  rejectedReferrals: number;
  estimatedCreditValueUsd: number;
  paidConversions: number;
  revenueUsd: number;
  createdAt: string;
};

type ReferralHistory = {
  id: string;
  status: string;
  rejectionReason: string | null;
  rewardStatus: string;
  createdAt: string;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  rewardCredits: number;
  remainingCredits: number;
  expiredCredits: number;
  expiresAt: string | null;
  estimatedUsdValue: number | null;
  referredUser: { email: string | null };
  rewardTransaction: { id: string; amount: number; createdAt: string; expiresAt: string | null; description: string | null } | null;
};

type Totals = {
  affiliates: number;
  trackedLinkOpens: number;
  signups: number;
  legacySignups: number;
  qualifyingReferrals: number;
  rewardsIssued: number;
  activeRewardCredits: number;
  expiredRewardCredits: number;
  estimatedCreditValueUsd: number;
  paidConversions: number;
  revenueUsd: number;
  rejectedReferrals: number;
};

type AffiliateDetails = { id: string; code: string; legacySignups: number; referrals: ReferralHistory[] };

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en', { dateStyle: 'medium', timeZone: 'UTC' }) : '—';
}

function MetricCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Coins }) {
  return (
    <div className="rounded-xl border border-border-light bg-white p-4">
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </p>
      <p className="mt-2 text-xl font-bold tabular-nums text-text">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-text-subtle">{note}</p>
    </div>
  );
}

export function AdminAffiliatesClient() {
  const searchParams = useSearchParams();
  const focusedAffiliateId = searchParams.get('affiliateId');
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateDetails | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { success, error: err } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (focusedAffiliateId) params.set('affiliateId', focusedAffiliateId);
    if (status !== 'ALL') params.set('status', status);
    fetch(`/api/admin/affiliates?${params}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) { setError(true); return; }
        setAffiliates(data.data.affiliates);
        setTotals(data.data.totals);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
        if (focusedAffiliateId) setSelectedAffiliate(data.data.selectedAffiliate);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, status, focusedAffiliateId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  async function toggleHistory(id: string) {
    if (selectedAffiliate?.id === id) {
      setSelectedAffiliate(null);
      return;
    }
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/admin/affiliates?affiliateId=${encodeURIComponent(id)}&page=1&pageSize=1`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error ?? 'Could not load referral history.');
      setSelectedAffiliate(data.data.selectedAffiliate);
    } catch (cause) {
      err('History could not be loaded', cause instanceof Error ? cause.message : undefined);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function doAction(id: string, action: 'approve' | 'suspend') {
    setActionId(id);
    const response = await fetch('/api/admin/affiliates', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, id }),
    });
    const data = await response.json().catch(() => null);
    if (data?.ok) {
      success(data.data.message);
      window.dispatchEvent(new Event('admin-notifications:refresh'));
      load();
    } else err('Failed', data?.error);
    setActionId(null);
  }

  if (error) return <AdminPage><PageHeader title="Affiliates" /><ErrorState message="Failed to load affiliate data." onRetry={load} /></AdminPage>;

  return (
    <AdminPage>
      <PageHeader title="Affiliates" description={`${total.toLocaleString()} affiliates in this view`} />

      {totals && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total affiliates" value={totals.affiliates.toLocaleString()} note="Pending, active, and suspended" icon={Users} />
          <MetricCard label="Tracked link opens" value={totals.trackedLinkOpens.toLocaleString()} note="Opens of active /r links; repeats included" icon={MousePointerClick} />
          <MetricCard label="Sign-ups" value={totals.signups.toLocaleString()} note={`${totals.qualifyingReferrals.toLocaleString()} qualifying referrals${totals.legacySignups > 0 ? ` · ${totals.legacySignups.toLocaleString()} historical aggregate` : ''}`} icon={UserCheck} />
          <MetricCard label="Referral rewards issued" value={`${totals.rewardsIssued.toLocaleString()} credits`} note={`${totals.activeRewardCredits.toLocaleString()} active · ${totals.expiredRewardCredits.toLocaleString()} expired unused`} icon={Gift} />
          <MetricCard label="Estimated credit value (USD)" value={`$${totals.estimatedCreditValueUsd.toFixed(2)}`} note="Frozen accounting estimate at grant time" icon={Coins} />
          <MetricCard label="Paid conversions" value={totals.paidConversions.toLocaleString()} note={`Revenue recorded: $${totals.revenueUsd.toFixed(2)}`} icon={DollarSign} />
          <MetricCard label="Rejected attempts" value={totals.rejectedReferrals.toLocaleString()} note="Known self-referrals or ineligible attributions" icon={Share2} />
        </div>
      )}
      <p className="mb-5 text-xs leading-5 text-text-muted">
        Sign-ups and qualifying referrals are tracked separately. Qualifying referrals earn SavCredits; they are not paid conversions or revenue.
        {totals?.legacySignups ? ' Historical sign-up totals from the previous tracker are preserved, but do not have individual referral or reward records.' : ''}
      </p>

      <div className="admin-sticky-toolbar mb-5">
        <div className="admin-sticky-toolbar-filters flex min-h-9 min-w-0 items-center gap-2 overflow-x-auto">
          {STATUSES.map((value) => (
            <FilterTab
              key={value}
              label={value === 'ALL' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}
              active={status === value}
              onClick={() => setStatus(value)}
            />
          ))}
        </div>
      </div>

      <TableCard stickyHeader>
        <Table stickyHeader>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Status</Th>
              <Th className="text-right">Link opens</Th>
              <Th className="text-right">Sign-ups</Th>
              <Th className="text-right">Qualifying</Th>
              <Th className="text-right">Rewards</Th>
              <Th className="text-right">Active</Th>
              <Th className="text-right">Expired</Th>
              <Th className="text-right">Est. value (USD)</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}><td colSpan={10} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : affiliates.length === 0 ? (
              <tr><td colSpan={10}>
                <EmptyState icon={Share2} title="No Affiliates" message="Affiliate partners will appear here when they join the program." />
              </td></tr>
            ) : affiliates.map((affiliate) => (
              <Fragment key={affiliate.id}>
                <tr key={affiliate.id} className={`hover:bg-surface/40 transition-colors ${focusedAffiliateId === affiliate.id ? 'bg-primary/[0.06] ring-2 ring-inset ring-primary/20' : ''}`}>
                  <Td><span className="rounded bg-surface px-2 py-0.5 font-mono text-[12px] font-medium">{affiliate.code}</span></Td>
                  <Td><StatusBadge status={affiliate.status} dot /></Td>
                  <Td className="text-right tabular-nums text-text-muted">{affiliate.totalClicks.toLocaleString()}</Td>
                  <Td className="text-right tabular-nums text-text-muted">{affiliate.totalSignups.toLocaleString()}</Td>
                  <Td className="text-right tabular-nums text-text-muted">{affiliate.qualifyingReferrals.toLocaleString()}</Td>
                  <Td className="text-right tabular-nums text-text-muted">{affiliate.rewardsIssued.toLocaleString()}</Td>
                  <Td className="text-right tabular-nums text-text-muted">{affiliate.activeRewardCredits.toLocaleString()}</Td>
                  <Td className="text-right tabular-nums text-text-muted">{affiliate.expiredRewardCredits.toLocaleString()}</Td>
                  <Td className="text-right tabular-nums text-text-muted">${affiliate.estimatedCreditValueUsd.toFixed(2)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      <button type="button" onClick={() => toggleHistory(affiliate.id)} disabled={historyLoading} className="rounded-lg border border-border-light px-2 py-1 text-[11px] font-medium text-text-muted hover:text-primary disabled:opacity-50">
                        {selectedAffiliate?.id === affiliate.id ? 'Hide history' : 'History'}
                      </button>
                      {affiliate.status !== 'ACTIVE' && (
                        <button disabled={actionId === affiliate.id} onClick={() => doAction(affiliate.id, 'approve')} className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Approve</button>
                      )}
                      {affiliate.status !== 'SUSPENDED' && (
                        <button disabled={actionId === affiliate.id} onClick={() => doAction(affiliate.id, 'suspend')} className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">Suspend</button>
                      )}
                    </div>
                  </Td>
                </tr>
                {selectedAffiliate?.id === affiliate.id && (
                  <tr key={`${affiliate.id}-history`}>
                    <td colSpan={10} className="bg-surface/40 px-5 py-5">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-text">Referral history · {selectedAffiliate.code}</p>
                        <p className="mt-1 text-xs text-text-muted">Latest 200 attributed users and their referral reward ledger status.{selectedAffiliate.legacySignups > 0 ? ` ${selectedAffiliate.legacySignups.toLocaleString()} older aggregate sign-ups have no individual history.` : ''}</p>
                      </div>
                      {selectedAffiliate.referrals.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border bg-white p-4 text-sm text-text-muted">{selectedAffiliate.legacySignups > 0 ? 'No per-user referral records are available yet. Historical aggregate sign-ups are preserved in the totals above; no individual reward records were created for them.' : 'No referral records have been attributed to this affiliate.'}</p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border-light bg-white">
                          <table className="w-full min-w-[900px] text-left text-xs">
                            <thead className="bg-surface text-[10px] uppercase tracking-wide text-text-muted">
                              <tr>
                                <th className="px-3 py-2.5 font-semibold">Referred account</th>
                                <th className="px-3 py-2.5 font-semibold">Sign-up</th>
                                <th className="px-3 py-2.5 font-semibold">Attribution</th>
                                <th className="px-3 py-2.5 font-semibold">Reward status</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Grant</th>
                                <th className="px-3 py-2.5 font-semibold">Expiry</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Est. value</th>
                                <th className="px-3 py-2.5 font-semibold">Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedAffiliate.referrals.map((referral) => (
                                <tr key={referral.id} className="border-t border-border-light">
                                  <td className="px-3 py-2.5 text-text">{referral.referredUser.email ?? 'Deleted account'}</td>
                                  <td className="px-3 py-2.5 text-text-muted">{formatDate(referral.createdAt)}</td>
                                  <td className="px-3 py-2.5"><StatusBadge status={referral.status} /></td>
                                  <td className="px-3 py-2.5"><StatusBadge status={referral.rewardStatus} /></td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-text">
                                    {referral.rewardTransaction ? `${referral.rewardTransaction.amount} credits · ${formatDate(referral.rewardTransaction.createdAt)}` : '—'}
                                  </td>
                                  <td className="px-3 py-2.5 text-text-muted">{formatDate(referral.expiresAt)}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-text">{referral.estimatedUsdValue == null ? '—' : `$${referral.estimatedUsdValue.toFixed(2)}`}</td>
                                  <td className="px-3 py-2.5 text-text-muted">{referral.rejectionReason ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
