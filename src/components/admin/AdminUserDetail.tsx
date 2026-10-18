'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, EmptyState,
} from './AdminUI';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { ArrowLeft, UserX, UserCheck, Trash2, Coins, CreditCard, ShieldCheck, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

// ── Types ──────────────────────────────────────────────────────────────────

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  interval: string;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  // Extended fields
  stripeSubscriptionId: string;
  cancelAtPeriodEnd: boolean;
  provider: string;
  stripePriceId: string;
}

interface CreditLedgerEntry {
  id: string;
  amount: number;
  kind: string;
  bucket: string;
  description: string | null;
  createdAt: string;
  // Extended balance-snapshot fields
  planDelta: number;
  purchasedDelta: number;
  balanceAfter: number | null;
  planBalanceAfter: number | null;
  purchasedBalanceAfter: number | null;
}

interface PaymentData {
  id: string;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  plan: string;
  planCredits: number;
  purchasedCredits: number;
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  planCreditsResetAt: string | null;
  subscriptions: SubscriptionData[];
  creditLedger: CreditLedgerEntry[];
  downloads: {
    id: string;
    tool: string;
    platform: string;
    status: string;
    failureCode: string | null;
    failureReason: string | null;
    createdAt: string;
  }[];
  reviews: {
    id: string;
    rating: number;
    review: string;
    status: string;
    createdAt: string;
  }[];
  payments: PaymentData[];
}

// ── Component ─────────────────────────────────────────────────────────────

export function AdminUserDetail({ user: initialUser }: { user: UserData }) {
  const router = useRouter();
  const { success, error: err } = useToast();
  const { confirm } = useConfirm();

  // Local copy of user data — updated by targeted fetch after each mutation,
  // preventing the full RSC remount that router.refresh() triggers.
  const [userData, setUserData] = useState<UserData>(initialUser);

  // Per-action loading key: only the triggered button shows a spinner.
  // Format: action name or `${action}-${id}` for targeted sub-actions.
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Modal states — preserved across data refreshes because they are independent state.
  const [creditModal, setCreditModal] = useState<'add' | 'remove' | null>(null);
  const [planModal, setPlanModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);

  // Form field states
  const [creditAmt, setCreditAmt] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [newPlan, setNewPlan] = useState(initialUser.plan);
  const [newRole, setNewRole] = useState(initialUser.role === 'ADMIN' ? 'ADMIN' : 'USER');

  // Tab state — never reset by data refreshes (lives in its own useState).
  const [tab, setTab] = useState<'overview' | 'credits' | 'downloads' | 'subscriptions' | 'reviews'>('overview');

  const closeCreditModal = useCallback(() => setCreditModal(null), []);
  const closePlanModal = useCallback(() => setPlanModal(false), []);
  const closeRoleModal = useCallback(() => setRoleModal(false), []);

  // Fetch fresh user data from the API and merge it into local state.
  // Does NOT trigger a full RSC remount — only the affected React state updates.
  async function refreshUserData() {
    try {
      const res = await fetch(`/api/admin/users/${userData.id}`);
      const d = await res.json().catch(() => null);
      if (d?.ok && d.data) {
        setUserData(d.data as UserData);
      }
    } catch {
      // Non-fatal — the mutation already succeeded; stale data is preferable
      // to showing an error after a successful action.
    }
  }

  // Central mutation handler. Uses a per-action key so only the relevant
  // button is disabled/shows a spinner. Never calls router.refresh().
  async function doAction(action: string, extra?: Record<string, unknown>, key?: string) {
    const lk = key ?? action;
    setLoadingKey(lk);
    try {
      const res = await fetch(`/api/admin/users/${userData.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json().catch(() => null);
      if (!d?.ok) {
        err('Action failed', d?.error);
        return false;
      }
      success(d.data.message);
      // Targeted refresh: pull fresh data into local state without remounting.
      await refreshUserData();
      return true;
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${userData.name ?? userData.email}?`,
      description: 'Permanently deletes this user and all their data. Cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    const done = await doAction('delete', {}, 'delete');
    // Only navigate away after delete — this is the single acceptable use of
    // router navigation because the record no longer exists.
    if (done) router.push('/admin/users');
  }

  async function handleCredits() {
    if (!creditAmt || !creditReason.trim()) return;
    const action = creditModal === 'add' ? 'addCredits' : 'removeCredits';
    const done = await doAction(action, { amount: parseInt(creditAmt, 10), reason: creditReason }, action);
    if (done) {
      setCreditModal(null);
      setCreditAmt('');
      setCreditReason('');
    }
  }

  const TABS = ['overview', 'credits', 'downloads', 'subscriptions', 'reviews'] as const;
  const isLoading = (key: string) => loadingKey === key;
  const anyLoading = loadingKey !== null;

  return (
    <AdminPage>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Users
        </Link>
      </div>

      <PageHeader
        title={userData.name ?? userData.email ?? userData.id}
        description={userData.email ?? ''}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setCreditModal('add')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <Coins className="w-3 h-3" /> Add Credits
            </button>
            <button
              onClick={() => setCreditModal('remove')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-surface text-text-muted hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <Coins className="w-3 h-3" /> Remove Credits
            </button>
            <button
              onClick={() => { setNewPlan(userData.plan); setPlanModal(true); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/[0.08] text-primary hover:bg-primary/[0.15] transition-colors"
            >
              <CreditCard className="w-3 h-3" /> Plan
            </button>
            <button
              onClick={() => { setNewRole(userData.role === 'ADMIN' ? 'ADMIN' : 'USER'); setRoleModal(true); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/[0.08] text-primary hover:bg-primary/[0.15] transition-colors"
            >
              <ShieldCheck className="w-3 h-3" /> Role
            </button>
            {userData.role === 'SUSPENDED' ? (
              <button
                disabled={anyLoading}
                onClick={() => doAction('restore', {}, 'restore')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {isLoading('restore') ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                Restore
              </button>
            ) : userData.role !== 'ADMIN' ? (
              <button
                disabled={anyLoading}
                onClick={() => doAction('suspend', {}, 'suspend')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {isLoading('suspend') ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                Suspend
              </button>
            ) : null}
            {userData.role !== 'ADMIN' && (
              <button
                disabled={anyLoading}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                {isLoading('delete') ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Delete
              </button>
            )}
          </div>
        }
      />

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Plan',              value: <StatusBadge status={userData.plan} dot /> },
          { label: 'Status',            value: <StatusBadge status={userData.role === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'} dot /> },
          { label: 'Plan Credits',      value: <span className="tabular-nums">{userData.planCredits.toLocaleString()}</span> },
          { label: 'Purchased Credits', value: <span className="tabular-nums">{userData.purchasedCredits.toLocaleString()}</span> },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-border-light rounded-xl p-4">
            <p className="text-[11px] text-text-muted mb-1">{label}</p>
            <div className="text-[13px] font-semibold text-text">{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs — tab state is independent of data refresh, never resets */}
      <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border-light w-fit mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold capitalize transition-all ${
              tab === t ? 'bg-white text-text shadow-sm border border-border-light' : 'text-text-muted hover:text-text'
            }`}
          >
            {t === 'downloads' ? 'Operations' : t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <TableCard>
          <div className="divide-y divide-border-light">
            {[
              { label: 'ID',             value: <span className="font-mono text-text-subtle text-[11px]">{userData.id}</span> },
              { label: 'Name',           value: userData.name ?? '—' },
              { label: 'Email',          value: userData.email ?? '—' },
              { label: 'Email Verified', value: userData.emailVerified ? new Date(userData.emailVerified).toLocaleDateString() : 'No' },
              { label: 'Role',           value: <StatusBadge status={userData.role} /> },
              { label: 'Plan',           value: <StatusBadge status={userData.plan} /> },
              { label: 'Credits Reset',  value: userData.planCreditsResetAt ? new Date(userData.planCreditsResetAt).toLocaleString() : '—' },
              { label: 'Joined',         value: new Date(userData.createdAt).toLocaleString() },
              { label: 'Last Updated',   value: new Date(userData.updatedAt).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="text-[13px] text-text-muted">{label}</span>
                <span className="text-[13px] text-text font-medium">{value}</span>
              </div>
            ))}
          </div>
        </TableCard>
      )}

      {/* Credits */}
      {tab === 'credits' && (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Bucket</Th>
                <Th>Amount</Th>
                <Th>Plan Δ</Th>
                <Th>Purchased Δ</Th>
                <Th>Balance After</Th>
                <Th>Note</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {userData.creditLedger.length === 0 ? (
                <tr><td colSpan={8}><EmptyState message="No credit transactions." /></td></tr>
              ) : userData.creditLedger.map((c) => (
                <tr key={c.id} className="hover:bg-surface/40">
                  <Td><StatusBadge status={c.kind} /></Td>
                  <Td className="text-text-muted capitalize">{c.bucket}</Td>
                  <Td className={`tabular-nums font-semibold ${c.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {c.amount > 0 ? '+' : ''}{c.amount}
                  </Td>
                  <Td className="tabular-nums text-text-muted">
                    {c.planDelta !== 0 ? (c.planDelta > 0 ? `+${c.planDelta}` : c.planDelta) : '—'}
                  </Td>
                  <Td className="tabular-nums text-text-muted">
                    {c.purchasedDelta !== 0 ? (c.purchasedDelta > 0 ? `+${c.purchasedDelta}` : c.purchasedDelta) : '—'}
                  </Td>
                  <Td className="tabular-nums text-text-muted">
                    {c.balanceAfter != null ? c.balanceAfter.toLocaleString() : '—'}
                  </Td>
                  <Td className="text-text-muted max-w-xs truncate">{c.description ?? '—'}</Td>
                  <Td className="text-xs text-text-muted">{new Date(c.createdAt).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableCard>
      )}

      {/* Operations */}
      {tab === 'downloads' && (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <Th>Tool</Th>
                <Th>Platform</Th>
                <Th>Status</Th>
                <Th>Details</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {userData.downloads.length === 0 ? (
                <tr><td colSpan={5}><EmptyState message="No operations." /></td></tr>
              ) : userData.downloads.map((d) => (
                <tr key={d.id} className="hover:bg-surface/40">
                  <Td className="font-medium">{d.tool}</Td>
                  <Td className="text-text-muted">{d.platform}</Td>
                  <Td><StatusBadge status={d.status} /></Td>
                  <Td className="max-w-[240px] text-[11px] text-text-muted">
                    {d.failureCode ? `${d.failureCode}${d.failureReason ? ` · ${d.failureReason}` : ''}` : '—'}
                  </Td>
                  <Td className="text-xs text-text-muted">{new Date(d.createdAt).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableCard>
      )}

      {/* Subscriptions */}
      {tab === 'subscriptions' && (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <Th>Plan</Th>
                <Th>Status</Th>
                <Th>Provider</Th>
                <Th>Interval</Th>
                <Th>Cancel at Period End</Th>
                <Th>Renews / Ends</Th>
                <Th>Stripe Sub ID</Th>
                <Th>Since</Th>
              </tr>
            </thead>
            <tbody>
              {userData.subscriptions.length === 0 ? (
                <tr><td colSpan={8}><EmptyState message="No subscriptions." /></td></tr>
              ) : userData.subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-surface/40">
                  <Td><StatusBadge status={s.plan} /></Td>
                  <Td><StatusBadge status={s.status} /></Td>
                  <Td className="capitalize text-text-muted">{s.provider}</Td>
                  <Td className="capitalize text-text-muted">{s.interval}</Td>
                  <Td className="text-text-muted">{s.cancelAtPeriodEnd ? 'Yes' : 'No'}</Td>
                  <Td className="text-text-muted text-xs">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}</Td>
                  <Td className="font-mono text-[11px] text-text-subtle max-w-[160px] truncate">{s.stripeSubscriptionId ?? '—'}</Td>
                  <Td className="text-text-muted text-xs">{new Date(s.createdAt).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableCard>
      )}

      {/* Reviews */}
      {tab === 'reviews' && (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <Th>Rating</Th>
                <Th>Review</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {userData.reviews.length === 0 ? (
                <tr><td colSpan={4}><EmptyState message="No reviews." /></td></tr>
              ) : userData.reviews.map((r) => (
                <tr key={r.id} className="hover:bg-surface/40">
                  <Td>{'★'.repeat(r.rating)}</Td>
                  <Td className="max-w-sm truncate text-text-muted">{r.review}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td className="text-xs text-text-muted">{new Date(r.createdAt).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableCard>
      )}

      {/* ── Credit modal ─────────────────────────────────────────────────── */}
      <Modal
        open={!!creditModal}
        onClose={closeCreditModal}
        title={creditModal === 'add' ? 'Add Credits' : 'Remove Credits'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Amount</label>
            <input
              type="number"
              min={1}
              value={creditAmt}
              onChange={(e) => setCreditAmt(e.target.value)}
              className="w-full h-10 rounded-lg border border-border-light px-3 text-[13px] text-text bg-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              placeholder="e.g. 100"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Reason (required)</label>
            <input
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              className="w-full h-10 rounded-lg border border-border-light px-3 text-[13px] text-text bg-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              placeholder="e.g. Refund for failed job"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setCreditModal(null)}
              className="px-3 py-1.5 rounded-lg text-[13px] text-text-muted hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <Button
              onClick={handleCredits}
              loading={isLoading('addCredits') || isLoading('removeCredits')}
              disabled={!creditAmt || !creditReason.trim() || anyLoading}
              size="sm"
            >
              {creditModal === 'add' ? 'Add Credits' : 'Remove Credits'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Change plan modal ─────────────────────────────────────────────── */}
      <Modal open={planModal} onClose={closePlanModal} title="Change Plan" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">New Plan</label>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              className="w-full h-10 rounded-lg border border-border-light px-3 text-[13px] text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            >
              {['FREE', 'PRO', 'MAX', 'LIFETIME'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setPlanModal(false)}
              className="px-3 py-1.5 rounded-lg text-[13px] text-text-muted hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <Button
              onClick={async () => {
                const done = await doAction('changePlan', { plan: newPlan }, 'changePlan');
                if (done) setPlanModal(false);
              }}
              loading={isLoading('changePlan')}
              disabled={anyLoading}
              size="sm"
            >
              Change Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Change role modal ─────────────────────────────────────────────── */}
      <Modal open={roleModal} onClose={closeRoleModal} title="Change Role" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">New Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full h-10 rounded-lg border border-border-light px-3 text-[13px] text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <p className="mt-2 text-xs text-text-subtle">
              Administrator access is applied when the user refreshes their session.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setRoleModal(false)}
              className="px-3 py-1.5 rounded-lg text-[13px] text-text-muted hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <Button
              onClick={async () => {
                const done = await doAction('changeRole', { role: newRole }, 'changeRole');
                if (done) setRoleModal(false);
              }}
              loading={isLoading('changeRole')}
              disabled={anyLoading}
              size="sm"
            >
              Save Role
            </Button>
          </div>
        </div>
      </Modal>
    </AdminPage>
  );
}
