'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AdminPage, SectionCard, TableCard, Table, Th, Td,
  StatCard, StatusBadge, EmptyState, ActionButton,
} from './AdminUI';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
  ArrowLeft, Coins, CreditCard, ShieldCheck, Loader2,
  Mail, Calendar, RefreshCw,
  CreditCard as SubscriptionIcon, AlertTriangle,
  Plus, Minus, Trash2, UserX, UserCheck, ChevronRight,
} from 'lucide-react';
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
  // Extended fields from FEAT-001
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  provider: string;
  stripePriceId: string | null;
}

interface CreditLedgerEntry {
  id: string;
  amount: number;
  kind: string;
  bucket: string;
  description: string | null;
  createdAt: string;
  // Extended balance-snapshot fields from FEAT-001
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
  // Step 9: extended fields
  stripeCustomerId: string | null;
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

// Plan descriptions for admin change-plan UI
const PLAN_DESCRIPTIONS: Record<string, string> = {
  FREE: 'Uses the current Free plan daily allowance and monthly cap from Pricing.',
  PRO: 'Uses the current Pro plan allowance and features configured in Pricing.',
  MAX: 'Uses the current Max plan allowance and features configured in Pricing.',
  LIFETIME: 'Uses the current finite lifetime credit package configured in Pricing.',
};

// ── Sub-components ─────────────────────────────────────────────────────────

/** Displays initials avatar when no image */
function UserAvatar({ name, email, image }: { name: string | null; email: string | null; image: string | null }) {
  const initials = (name ?? email ?? '?')
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={name ?? email ?? 'User'} className="w-16 h-16 rounded-2xl object-cover border border-border-light" />
    );
  }
  return (
    <div className="w-16 h-16 rounded-2xl bg-primary/[0.08] flex items-center justify-center border border-primary/20">
      <span className="text-xl font-bold text-primary">{initials}</span>
    </div>
  );
}

function formatPaymentAmount(payment: PaymentData) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: payment.currency.toUpperCase(),
    }).format(payment.amount / 100);
  } catch {
    return `${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`;
  }
}

// ── Main Component ─────────────────────────────────────────────────────────

type TabKey = 'overview' | 'subscriptions' | 'credits' | 'operations' | 'reviews' | 'account';

type CreditModalState = {
  open: boolean;
  mode: 'add' | 'remove';
  bucket: 'plan' | 'purchased';
};

type SubModalState = {
  open: boolean;
  action: 'cancelRenewal' | 'resumeRenewal' | 'revokeAccess' | null;
  sub: SubscriptionData | null;
};

type NotificationRetry = { auditId: string; message: string } | null;

export function AdminUserDetail({ user: initialUser }: { user: UserData }) {
  const router = useRouter();
  const { success, error: err } = useToast();
  const { confirm } = useConfirm();

  // Local data state — updated by targeted fetch after mutations (no router.refresh())
  const [userData, setUserData] = useState<UserData>(initialUser);

  // Per-action loading key
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Tab state — never reset by data refreshes
  const [tab, setTab] = useState<TabKey>('overview');

  // ── Credit modal ──────────────────────────────────────────────────────────
  const [creditModal, setCreditModal] = useState<CreditModalState>({
    open: false,
    mode: 'add',
    bucket: 'purchased',
  });
  const [creditAmt, setCreditAmt] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditNotify, setCreditNotify] = useState(false);

  // ── Subscription action modal ─────────────────────────────────────────────
  const [subModal, setSubModal] = useState<SubModalState>({
    open: false,
    action: null,
    sub: null,
  });
  const [subReason, setSubReason] = useState('');
  const [subNotify, setSubNotify] = useState(true);

  // ── Plan modal ────────────────────────────────────────────────────────────
  const [newPlan, setNewPlan] = useState(initialUser.plan);
  const [planReason, setPlanReason] = useState('');
  const [planNotify, setPlanNotify] = useState(false);

  // ── Role modal ────────────────────────────────────────────────────────────
  const [newRole, setNewRole] = useState(initialUser.role === 'ADMIN' ? 'ADMIN' : 'USER');
  const [notificationRetry, setNotificationRetry] = useState<NotificationRetry>(null);

  // Helpers
  const isLoading = (key: string) => loadingKey === key;
  const anyLoading = loadingKey !== null;

  // Pull fresh data into local state without remounting the tree
  async function refreshUserData() {
    try {
      const res = await fetch(`/api/admin/users/${userData.id}`);
      const d = await res.json().catch(() => null);
      if (d?.ok && d.data) {
        setUserData(d.data as UserData);
      }
    } catch {
      // Non-fatal — mutation already succeeded
    }
  }

  // Central mutation handler — never calls router.refresh()
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
        err('Action failed', d?.error ?? 'An unexpected error occurred.');
        return false;
      }
      success(d.data?.message ?? 'Action completed.');
      const notification = d.data?.notification as { status?: string; message?: string; retryAuditId?: string } | undefined;
      if (notification?.status === 'failed') {
        if (notification.retryAuditId) {
          setNotificationRetry({ auditId: notification.retryAuditId, message: notification.message ?? 'Email delivery failed.' });
        }
        err('Action completed, but email failed', notification.message);
      } else if (notification?.status === 'sent') {
        setNotificationRetry(null);
      }
      await refreshUserData();
      return true;
    } catch (error) {
      err('Action failed', error instanceof Error ? error.message : 'The server could not be reached.');
      return false;
    } finally {
      setLoadingKey(null);
    }
  }

  async function retryNotification() {
    if (!notificationRetry) return;
    setLoadingKey('retryNotification');
    try {
      const res = await fetch(`/api/admin/users/${userData.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'retryNotification', auditId: notificationRetry.auditId }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        err('Email retry failed', d?.error ?? 'The email provider did not accept the message.');
        return;
      }
      success('User notification sent.');
      setNotificationRetry(null);
    } catch (error) {
      err('Email retry failed', error instanceof Error ? error.message : 'The server could not be reached.');
    } finally {
      setLoadingKey(null);
    }
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${userData.name ?? userData.email}?`,
      description:
        'This permanently deletes this user, all their downloads, credit history, and associated data. This action cannot be undone.',
      confirmLabel: 'Delete permanently',
      variant: 'danger',
    });
    if (!ok) return;
    const done = await doAction('delete', {}, 'delete');
    if (done) router.push('/admin/users');
  }

  async function handleSuspend() {
    const done = await doAction('suspend', {}, 'suspend');
    if (done) { /* userData state updated by refreshUserData */ }
  }

  async function handleRestore() {
    const done = await doAction('restore', {}, 'restore');
    if (done) { /* userData state updated by refreshUserData */ }
  }

  async function handleCredits() {
    if (!creditAmt || !creditReason.trim()) return;
    const action = creditModal.mode === 'add' ? 'addCredits' : 'removeCredits';
    const lk = `${action}-${creditModal.bucket}`;
    const done = await doAction(
      action,
      {
        amount: parseInt(creditAmt, 10),
        reason: creditReason,
        bucket: creditModal.bucket,
        notify: creditNotify,
      },
      lk,
    );
    if (done) {
      setCreditModal({ open: false, mode: 'add', bucket: 'purchased' });
      setCreditAmt('');
      setCreditReason('');
      setCreditNotify(false);
    }
  }

  function openCreditModal(mode: 'add' | 'remove', bucket: 'plan' | 'purchased') {
    setCreditAmt('');
    setCreditReason('');
    setCreditNotify(false);
    setCreditModal({ open: true, mode, bucket });
  }

  function openSubModal(action: SubModalState['action'], sub: SubscriptionData) {
    setSubReason('');
    setSubNotify(true);
    setSubModal({ open: true, action, sub });
  }

  async function handleSubAction() {
    if (!subModal.sub || !subModal.action || !subReason.trim()) return;
    const lk = `sub-${subModal.action}-${subModal.sub.id}`;
    const actionMap: Record<NonNullable<SubModalState['action']>, string> = {
      cancelRenewal: 'cancelSubscriptionRenewal',
      resumeRenewal: 'resumeSubscriptionRenewal',
      revokeAccess: 'revokeSubscriptionAccess',
    };
    const done = await doAction(
      actionMap[subModal.action],
      {
        subscriptionId: subModal.sub.id,
        reason: subReason,
        notify: subNotify,
      },
      lk,
    );
    if (done) {
      setSubModal({ open: false, action: null, sub: null });
      setSubReason('');
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const totalCredits = userData.planCredits + userData.purchasedCredits;
  const activeSubCount = userData.subscriptions.filter((s) => ['active', 'trialing'].includes(s.status)).length;
  const recentCreditsUsed = userData.creditLedger
    .filter((entry) => entry.kind === 'spend' && entry.amount < 0)
    .reduce((total, entry) => total + Math.abs(entry.amount), 0);
  const lastActivityAt = userData.downloads[0]?.createdAt ?? null;
  const accountStatus =
    userData.role === 'SUSPENDED' ? 'SUSPENDED' : userData.role === 'ADMIN' ? 'ADMIN' : 'ACTIVE';

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview',       label: 'Overview' },
    { key: 'subscriptions',  label: 'Subscriptions' },
    { key: 'credits',        label: 'Credits' },
    { key: 'operations',     label: 'Operations' },
    { key: 'reviews',        label: 'Reviews' },
    { key: 'account',        label: 'Account' },
  ];

  // ── Modal descriptions for subscription actions ───────────────────────────

  function subModalTitle() {
    if (!subModal.action) return '';
    return {
      cancelRenewal: 'Cancel Renewal',
      resumeRenewal: 'Restore Renewal',
      revokeAccess: 'Revoke Access Now',
    }[subModal.action];
  }

  function subModalDescription() {
    const s = subModal.sub;
    if (!s || !subModal.action) return '';
    const endDate = s.currentPeriodEnd
      ? new Date(s.currentPeriodEnd).toLocaleDateString()
      : 'the period end date';
    return {
      cancelRenewal: `Cancel Renewal will stop this ${s.plan} subscription from renewing at period end. The user retains access until ${endDate}. This calls the Stripe API to set cancel_at_period_end=true.`,
      resumeRenewal: `Restore Renewal removes the scheduled cancellation for this ${s.plan} subscription. Stripe will resume automatic renewal.`,
      revokeAccess: `Revoke Access Now immediately cancels the ${s.plan} subscription via Stripe. The user loses access immediately and will not receive a refund. This cannot be undone.`,
    }[subModal.action];
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminPage>
      {/* Back nav */}
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Users
        </Link>
      </div>

      {/* ── STEP 1: Rich user header ─────────────────────────────────────── */}
      <div className="bg-white border border-border-light rounded-xl p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <UserAvatar name={userData.name} email={userData.email} image={userData.image} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-text tracking-tight truncate">
                {userData.name ?? userData.email ?? userData.id}
              </h1>
              <StatusBadge status={accountStatus} dot />
              <StatusBadge status={userData.plan} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-text-muted">
              {userData.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {userData.email}
                  {userData.emailVerified
                    ? <span className="text-emerald-600 font-medium ml-1">(verified)</span>
                    : <span className="text-amber-600 font-medium ml-1">(unverified)</span>}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined {new Date(userData.createdAt).toLocaleDateString()}
              </span>
              {userData.planCreditsResetAt && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Plan resets {new Date(userData.planCreditsResetAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {notificationRetry && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold text-amber-900">The entitlement action succeeded, but its email did not send.</p>
            <p className="mt-0.5 text-[12px] text-amber-800">{notificationRetry.message}</p>
          </div>
          <ActionButton
            variant="secondary"
            disabled={anyLoading}
            onClick={retryNotification}
            className="shrink-0 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
          >
            {isLoading('retryNotification') && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isLoading('retryNotification') ? 'Retrying…' : 'Retry Email Only'}
          </ActionButton>
        </div>
      )}

      {/* ── STEP 1: 5 stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Plan Credits"
          value={userData.planCredits.toLocaleString()}
          sub="Resets each period"
          icon={Coins}
          accent="purple"
        />
        <StatCard
          label="Purchased Credits"
          value={userData.purchasedCredits.toLocaleString()}
          sub="Never expire"
          icon={CreditCard}
          accent="blue"
        />
        <StatCard
          label="Total Credits"
          value={totalCredits.toLocaleString()}
          sub="Plan + purchased"
          icon={Coins}
          accent="green"
        />
        <StatCard
          label="Resets"
          value={userData.planCreditsResetAt ? new Date(userData.planCreditsResetAt).toLocaleDateString() : '—'}
          sub="Plan credit reset date"
          icon={RefreshCw}
          accent="amber"
        />
        <StatCard
          label="Active Subscriptions"
          value={activeSubCount}
          sub={activeSubCount === 1 ? '1 active' : `${activeSubCount} active`}
          icon={SubscriptionIcon}
          accent={activeSubCount > 0 ? 'green' : 'purple'}
        />
      </div>

      {/* ── STEP 2: Tab bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 bg-surface rounded-lg p-1 border border-border-light w-fit mb-6">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
              tab === key
                ? 'bg-white text-text shadow-sm border border-border-light'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 3: Overview tab
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <TableCard>
          <div className="divide-y divide-border-light">
            {[
              { label: 'ID', value: <span className="font-mono text-text-subtle text-[11px]">{userData.id}</span> },
              { label: 'Name', value: userData.name ?? '—' },
              { label: 'Email', value: userData.email ?? '—' },
              {
                label: 'Email Verified',
                value: userData.emailVerified
                  ? new Date(userData.emailVerified).toLocaleDateString()
                  : <span className="text-amber-600">Not verified</span>,
              },
              { label: 'Role', value: <StatusBadge status={userData.role} /> },
              { label: 'Plan', value: <StatusBadge status={userData.plan} /> },
              { label: 'Plan Credits', value: <span className="tabular-nums font-semibold">{userData.planCredits.toLocaleString()}</span> },
              { label: 'Purchased Credits', value: <span className="tabular-nums font-semibold">{userData.purchasedCredits.toLocaleString()}</span> },
              { label: 'Total Credits', value: <span className="tabular-nums font-semibold">{totalCredits.toLocaleString()}</span> },
              {
                label: 'Credits Used (recent ledger)',
                value: <span className="tabular-nums font-semibold">{recentCreditsUsed.toLocaleString()}</span>,
              },
              {
                label: 'Credits Reset',
                value: userData.planCreditsResetAt
                  ? new Date(userData.planCreditsResetAt).toLocaleString()
                  : '—',
              },
              {
                label: 'Stripe Customer ID',
                value: userData.stripeCustomerId
                  ? (
                    <span className="font-mono text-[11px] text-text-subtle">
                      {'···' + userData.stripeCustomerId.slice(-8)}
                    </span>
                  )
                  : '—',
              },
              {
                label: 'Active Subscriptions',
                value: (
                  <button
                    onClick={() => setTab('subscriptions')}
                    className="inline-flex items-center gap-1 text-primary hover:underline text-[13px] font-medium"
                  >
                    {activeSubCount} active
                    <ChevronRight className="w-3 h-3" />
                  </button>
                ),
              },
              { label: 'Joined', value: new Date(userData.createdAt).toLocaleString() },
              { label: 'Last Activity', value: lastActivityAt ? new Date(lastActivityAt).toLocaleString() : 'No recorded operations' },
              { label: 'Last Updated', value: new Date(userData.updatedAt).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="text-[13px] text-text-muted">{label}</span>
                <span className="text-[13px] text-text font-medium">{value}</span>
              </div>
            ))}
          </div>
        </TableCard>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 4: Subscriptions tab — one SectionCard per subscription
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'subscriptions' && (
        <div className="space-y-4">
          {userData.subscriptions.length === 0 ? (
            <TableCard>
              <EmptyState
                icon={SubscriptionIcon}
                title="No subscriptions"
                message="This user has no subscription records."
              />
            </TableCard>
          ) : (
            userData.subscriptions.map((s) => {
              const lkCancel = `sub-cancelRenewal-${s.id}`;
              const lkRevoke = `sub-revokeAccess-${s.id}`;

              return (
                <SectionCard
                  key={s.id}
                  title={`${s.plan} subscription`}
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      {/* active + not canceling — show Cancel Renewal */}
                      {['active', 'trialing'].includes(s.status) && !s.cancelAtPeriodEnd && (
                        <ActionButton
                          variant="secondary"
                          disabled={anyLoading || s.provider === 'SAFEPAY' || !s.stripeSubscriptionId}
                          onClick={() => openSubModal('cancelRenewal', s)}
                          className="text-amber-700 border-amber-200 hover:bg-amber-50"
                        >
                          {isLoading(lkCancel) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {isLoading(lkCancel) ? 'Canceling…' : 'Cancel Renewal'}
                        </ActionButton>
                      )}
                      {/* active + cancelAtPeriodEnd — show Revoke Access Now + Undo Cancel */}
                      {['active', 'trialing'].includes(s.status) && s.cancelAtPeriodEnd && (
                        <>
                          <ActionButton
                            variant="danger"
                            disabled={anyLoading || s.provider === 'SAFEPAY' || !s.stripeSubscriptionId}
                            onClick={() => openSubModal('revokeAccess', s)}
                          >
                            {isLoading(lkRevoke) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isLoading(lkRevoke) ? 'Revoking…' : 'Revoke Access Now'}
                          </ActionButton>
                          <ActionButton
                            variant="secondary"
                            disabled={anyLoading || s.provider === 'SAFEPAY' || !s.stripeSubscriptionId}
                            onClick={() => openSubModal('resumeRenewal', s)}
                          >
                            Restore Renewal
                          </ActionButton>
                        </>
                      )}
                    </div>
                  }
                >
                  <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Plan</p>
                      <StatusBadge status={s.plan} dot />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Status</p>
                      <StatusBadge status={s.status} dot />
                      {s.cancelAtPeriodEnd && s.status === 'active' && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                          <AlertTriangle className="w-3 h-3" /> Cancels at period end
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Provider</p>
                      <span className="text-[13px] text-text font-medium">{s.provider}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Interval</p>
                      <span className="text-[13px] text-text capitalize">{s.interval || '—'}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                        {s.cancelAtPeriodEnd ? 'Access Until' : 'Renews'}
                      </p>
                      <span className="text-[13px] text-text">
                        {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Created</p>
                      <span className="text-[13px] text-text">{new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Provider Subscription ID</p>
                      <span className="font-mono text-[11px] text-text-subtle">
                        {s.stripeSubscriptionId ?? '—'}
                      </span>
                    </div>
                    {s.stripePriceId && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Stripe Price ID</p>
                        <span className="font-mono text-[11px] text-text-subtle">{s.stripePriceId}</span>
                      </div>
                    )}
                    {s.provider === 'SAFEPAY' && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                          Safepay subscription — manage cancellation directly in the Safepay dashboard.
                        </p>
                      </div>
                    )}
                  </div>
                </SectionCard>
              );
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 6: Credits tab — balance panel + ledger
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'credits' && (
        <div className="space-y-4">
          {/* Credit Balances panel */}
          <SectionCard title="Credit Balances">
            <div className="border-b border-border-light bg-surface/50 px-5 py-3 text-[11px] leading-relaxed text-text-muted">
              The database stores two authoritative balances: plan and purchased. Lifetime and one-time grants share the purchased bucket; historical rows identify their source, but this schema cannot reliably assign a remaining balance to an individual grant.
            </div>
            <div className="divide-y divide-border-light">
              {/* Plan credits row */}
              <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-text">Plan Credits</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Resets each billing period
                    {userData.planCreditsResetAt
                      ? ` · next reset ${new Date(userData.planCreditsResetAt).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <span className="tabular-nums text-xl font-bold text-text">
                    {userData.planCredits.toLocaleString()}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ActionButton
                      variant="secondary"
                      icon={Plus}
                      disabled={anyLoading}
                      onClick={() => openCreditModal('add', 'plan')}
                      className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                      Add Plan Credits
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      icon={Minus}
                      disabled={anyLoading}
                      onClick={() => openCreditModal('remove', 'plan')}
                      className="text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      Remove Plan Credits
                    </ActionButton>
                  </div>
                </div>
              </div>
              {/* Purchased credits row */}
              <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-text">Purchased Credits</p>
                  <p className="text-[11px] text-text-muted mt-0.5">One-time purchases — never expire</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <span className="tabular-nums text-xl font-bold text-text">
                    {userData.purchasedCredits.toLocaleString()}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ActionButton
                      variant="secondary"
                      icon={Plus}
                      disabled={anyLoading}
                      onClick={() => openCreditModal('add', 'purchased')}
                      className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                      Add Purchased Credits
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      icon={Minus}
                      disabled={anyLoading}
                      onClick={() => openCreditModal('remove', 'purchased')}
                      className="text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      Remove Purchased Credits
                    </ActionButton>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Credit Ledger */}
          <TableCard stickyHeader>
            <div className="px-5 py-3.5 border-b border-border-light">
              <h3 className="text-sm font-semibold text-text">Credit Ledger</h3>
              <p className="text-[11px] text-text-muted mt-0.5">Last 30 transactions</p>
            </div>
            <Table stickyHeader>
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

          <TableCard>
            <div className="border-b border-border-light px-5 py-3.5">
              <h3 className="text-sm font-semibold text-text">Related Payments</h3>
              <p className="mt-0.5 text-[11px] text-text-muted">Recent payment records are shown for context; credit balances remain ledger-backed.</p>
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Provider</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Provider ID</Th>
                  <Th>Paid</Th>
                </tr>
              </thead>
              <tbody>
                {userData.payments.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState message="No payment records." /></td></tr>
                ) : userData.payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-surface/40">
                    <Td className="font-medium">{payment.provider}</Td>
                    <Td className="tabular-nums">{formatPaymentAmount(payment)}</Td>
                    <Td><StatusBadge status={payment.status} /></Td>
                    <Td className="max-w-[220px] truncate font-mono text-[11px] text-text-subtle">{payment.providerPaymentId}</Td>
                    <Td className="text-xs text-text-muted">{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Operations tab (was "downloads")
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'operations' && (
        <TableCard stickyHeader>
          <Table stickyHeader>
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

      {/* Reviews tab */}
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

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 8: Account tab — Suspend/Restore/Delete/Role/Plan in SectionCards
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'account' && (
        <div className="space-y-4">
          {/* Change Plan */}
          <SectionCard
            title="Manual Plan Entitlement"
            subtitle={`Current plan: ${userData.plan}`}
          >
            <div className="px-5 py-4 space-y-3">
              <p className="text-[13px] text-text-muted">
                This changes the local plan entitlement and its allowance. It is blocked while a provider subscription is active; recurring plans must be managed in the Subscriptions tab.
              </p>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">New Plan</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full max-w-xs h-10 rounded-lg border border-border-light px-3 text-[13px] text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                >
                  {['FREE', 'PRO', 'MAX', 'LIFETIME'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {newPlan && (
                  <p className="mt-2 text-[12px] text-text-subtle">{PLAN_DESCRIPTIONS[newPlan]}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-muted">Reason (required)</label>
                <input
                  value={planReason}
                  onChange={(event) => setPlanReason(event.target.value)}
                  placeholder="e.g. Approved account upgrade"
                  className="h-10 w-full max-w-xl rounded-lg border border-border-light bg-white px-3 text-[13px] text-text placeholder:text-text-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text-muted">
                <input
                  type="checkbox"
                  checked={planNotify}
                  onChange={(event) => setPlanNotify(event.target.checked)}
                  className="rounded border-border-light"
                />
                Notify user by email
              </label>
              <div className="flex items-center gap-2 pt-1">
                <ActionButton
                  variant="primary"
                  icon={isLoading('changePlan') ? undefined : CreditCard}
                  disabled={anyLoading || newPlan === userData.plan || planReason.trim().length < 3}
                  onClick={async () => {
                    const done = await doAction('changePlan', { plan: newPlan, reason: planReason, notify: planNotify }, 'changePlan');
                    if (done) {
                      setPlanReason('');
                      setPlanNotify(false);
                    }
                  }}
                >
                  {isLoading('changePlan') && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isLoading('changePlan') ? 'Changing…' : 'Change Plan'}
                </ActionButton>
              </div>
            </div>
          </SectionCard>

          {/* Change Role */}
          <SectionCard
            title="Change Role"
            subtitle={`Current role: ${userData.role}`}
          >
            <div className="px-5 py-4 space-y-3">
              <p className="text-[13px] text-text-muted">
                Role changes take effect when the user refreshes their session. Demoting yourself from ADMIN is prevented.
              </p>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full max-w-xs h-10 rounded-lg border border-border-light px-3 text-[13px] text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <ActionButton
                  variant="primary"
                  icon={isLoading('changeRole') ? undefined : ShieldCheck}
                  disabled={anyLoading || newRole === userData.role}
                  onClick={async () => {
                    await doAction('changeRole', { role: newRole }, 'changeRole');
                  }}
                >
                  {isLoading('changeRole') && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isLoading('changeRole') ? 'Saving…' : 'Save Role'}
                </ActionButton>
              </div>
            </div>
          </SectionCard>

          {/* Suspend / Restore */}
          <SectionCard
            title={userData.role === 'SUSPENDED' ? 'Restore Account' : 'Suspend Account'}
            subtitle={
              userData.role === 'SUSPENDED'
                ? 'This account is currently suspended.'
                : 'Suspending blocks the user from logging in and using the service.'
            }
          >
            <div className="px-5 py-4">
              {userData.role === 'SUSPENDED' ? (
                <ActionButton
                  variant="secondary"
                  icon={isLoading('restore') ? undefined : UserCheck}
                  disabled={anyLoading}
                  onClick={handleRestore}
                  className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  {isLoading('restore') && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isLoading('restore') ? 'Restoring…' : 'Restore Account'}
                </ActionButton>
              ) : userData.role !== 'ADMIN' ? (
                <ActionButton
                  variant="secondary"
                  icon={isLoading('suspend') ? undefined : UserX}
                  disabled={anyLoading}
                  onClick={handleSuspend}
                  className="text-amber-700 border-amber-200 hover:bg-amber-50"
                >
                  {isLoading('suspend') && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isLoading('suspend') ? 'Suspending…' : 'Suspend Account'}
                </ActionButton>
              ) : (
                <p className="text-[13px] text-text-muted">Admin accounts cannot be suspended.</p>
              )}
            </div>
          </SectionCard>

          {/* Delete */}
          {userData.role !== 'ADMIN' && (
            <SectionCard
              title="Delete Account"
              subtitle="Permanently deletes this user and all associated data. This cannot be undone."
              className="border-rose-200"
            >
              <div className="px-5 py-4">
                <ActionButton
                  variant="danger"
                  icon={isLoading('delete') ? undefined : Trash2}
                  disabled={anyLoading}
                  onClick={handleDelete}
                >
                  {isLoading('delete') && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isLoading('delete') ? 'Deleting…' : 'Delete Account'}
                </ActionButton>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Credit modal — bucket is pre-set and read-only */}
      <Modal
        open={creditModal.open}
        onClose={() => setCreditModal((prev) => ({ ...prev, open: false }))}
        title={
          creditModal.mode === 'add'
            ? `Add ${creditModal.bucket === 'plan' ? 'Plan' : 'Purchased'} Credits`
            : `Remove ${creditModal.bucket === 'plan' ? 'Plan' : 'Purchased'} Credits`
        }
        size="sm"
      >
        <div className="space-y-4">
          {/* Read-only bucket indicator */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Credit Bucket</label>
            <div className="h-10 rounded-lg border border-border-light px-3 flex items-center bg-surface text-[13px] text-text font-semibold">
              {creditModal.bucket === 'plan' ? 'Plan Credits (resets monthly)' : 'Purchased Credits (never expire)'}
            </div>
            <p className="mt-1 text-[11px] text-text-subtle">
              This is fixed based on which button you clicked and cannot be changed here.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">
              Amount
              {creditModal.mode === 'remove' && (
                <span className="ml-2 font-normal text-text-subtle">
                  (max: {(creditModal.bucket === 'plan' ? userData.planCredits : userData.purchasedCredits).toLocaleString()})
                </span>
              )}
            </label>
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

          <label className="flex items-center gap-2 cursor-pointer text-[13px] text-text-muted">
            <input
              type="checkbox"
              checked={creditNotify}
              onChange={(e) => setCreditNotify(e.target.checked)}
              className="rounded border-border-light"
            />
            Notify user by email
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setCreditModal((prev) => ({ ...prev, open: false }))}
              className="px-3 py-1.5 rounded-lg text-[13px] text-text-muted hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <Button
              onClick={handleCredits}
              loading={
                isLoading(`addCredits-${creditModal.bucket}`) ||
                isLoading(`removeCredits-${creditModal.bucket}`)
              }
              disabled={!creditAmt || !creditReason.trim() || anyLoading}
              size="sm"
            >
              {creditModal.mode === 'add' ? 'Add Credits' : 'Remove Credits'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subscription action modal */}
      <Modal
        open={subModal.open}
        onClose={() => setSubModal((prev) => ({ ...prev, open: false }))}
        title={subModalTitle()}
        size="sm"
      >
        {subModal.sub && (
          <div className="space-y-4">
            <div className="bg-surface rounded-lg px-4 py-3 text-[13px] text-text-muted leading-relaxed">
              {subModalDescription()}
            </div>

            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Reason (required)</label>
              <input
                value={subReason}
                onChange={(e) => setSubReason(e.target.value)}
                className="w-full h-10 rounded-lg border border-border-light px-3 text-[13px] text-text bg-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                placeholder="e.g. User requested cancellation"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-[13px] text-text-muted">
              <input
                type="checkbox"
                checked={subNotify}
                onChange={(e) => setSubNotify(e.target.checked)}
                className="rounded border-border-light"
              />
              Notify user by email
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSubModal((prev) => ({ ...prev, open: false }))}
                className="px-3 py-1.5 rounded-lg text-[13px] text-text-muted hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={handleSubAction}
                loading={!!loadingKey?.startsWith('sub-')}
                disabled={!subReason.trim() || anyLoading}
                size="sm"
                variant={subModal.action === 'revokeAccess' ? 'dark' : 'primary'}
              >
                {subModalTitle()}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </AdminPage>
  );
}
