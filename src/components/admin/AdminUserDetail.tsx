'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, EmptyState,
} from './AdminUI';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { ArrowLeft, UserX, UserCheck, Trash2, Coins, CreditCard, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface UserData {
  id: string; name: string | null; email: string | null; image: string | null;
  role: string; plan: string; planCredits: number; purchasedCredits: number;
  createdAt: string; updatedAt: string; emailVerified: string | null;
  planCreditsResetAt: string | null;
  subscriptions: { id: string; plan: string; status: string; interval: string; currentPeriodEnd: string | null; createdAt: string; updatedAt: string }[];
  creditLedger: { id: string; amount: number; kind: string; bucket: string; description: string | null; createdAt: string }[];
  downloads: { id: string; tool: string; platform: string; status: string; createdAt: string }[];
  reviews: { id: string; rating: number; review: string; status: string; createdAt: string }[];
}

export function AdminUserDetail({ user }: { user: UserData }) {
  const router                = useRouter();
  const { success, error: err } = useToast();
  const { confirm }           = useConfirm();
  const [loading, setLoading] = useState(false);
  const [creditModal, setCreditModal] = useState<'add' | 'remove' | null>(null);
  const [planModal, setPlanModal]     = useState(false);
  const [roleModal, setRoleModal]     = useState(false);
  const [creditAmt, setCreditAmt]     = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [newPlan, setNewPlan]         = useState(user.plan);
  const [newRole, setNewRole]         = useState(user.role === 'ADMIN' ? 'ADMIN' : 'USER');
  const [tab, setTab]                 = useState<'overview' | 'credits' | 'downloads' | 'subscriptions' | 'reviews'>('overview');

  async function doAction(action: string, extra?: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json().catch(() => null);
      if (!d?.ok) { err('Action failed', d?.error); return; }
      success(d.data.message);
      router.refresh();
    } finally { setLoading(false); }
  }

  async function handleDelete() {
    const ok = await confirm({ title: `Delete ${user.name ?? user.email}?`, description: 'Permanently deletes this user and all their data. Cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    await doAction('delete');
    router.push('/admin/users');
  }

  async function handleCredits() {
    if (!creditAmt || !creditReason.trim()) return;
    await doAction(creditModal === 'add' ? 'addCredits' : 'removeCredits', { amount: parseInt(creditAmt), reason: creditReason });
    setCreditModal(null); setCreditAmt(''); setCreditReason('');
  }

  const TABS = ['overview', 'credits', 'downloads', 'subscriptions', 'reviews'] as const;

  return (
    <AdminPage>
      <div className="mb-6">
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Users
        </Link>
      </div>

      <PageHeader
        title={user.name ?? user.email ?? user.id}
        description={user.email ?? ''}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => setCreditModal('add')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
              <Coins className="w-3 h-3" /> Add Credits
            </button>
            <button onClick={() => setCreditModal('remove')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-surface text-text-muted hover:bg-rose-50 hover:text-rose-600 transition-colors">
              <Coins className="w-3 h-3" /> Remove
            </button>
            <button onClick={() => setPlanModal(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/[0.08] text-primary hover:bg-primary/[0.15] transition-colors">
              <CreditCard className="w-3 h-3" /> Plan
            </button>
            <button onClick={() => { setNewRole(user.role === 'ADMIN' ? 'ADMIN' : 'USER'); setRoleModal(true); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/[0.08] text-primary hover:bg-primary/[0.15] transition-colors">
              <ShieldCheck className="w-3 h-3" /> Role
            </button>
            {user.role === 'SUSPENDED' ? (
              <button disabled={loading} onClick={() => doAction('restore')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                <UserCheck className="w-3 h-3" /> Restore
              </button>
            ) : user.role !== 'ADMIN' ? (
              <button disabled={loading} onClick={() => doAction('suspend')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50">
                <UserX className="w-3 h-3" /> Suspend
              </button>
            ) : null}
            {user.role !== 'ADMIN' && (
              <button disabled={loading} onClick={handleDelete} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        }
      />

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Plan',            value: <StatusBadge status={user.plan} dot /> },
          { label: 'Status',          value: <StatusBadge status={user.role === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'} dot /> },
          { label: 'Plan Credits',    value: <span className="tabular-nums">{user.planCredits.toLocaleString()}</span> },
          { label: 'Purchased Credits', value: <span className="tabular-nums">{user.purchasedCredits.toLocaleString()}</span> },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-border-light rounded-xl p-4">
            <p className="text-[11px] text-text-muted mb-1">{label}</p>
            <div className="text-[13px] font-semibold text-text">{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border-light w-fit mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold capitalize transition-all ${tab === t ? 'bg-white text-text shadow-sm border border-border-light' : 'text-text-muted hover:text-text'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <TableCard>
          <div className="divide-y divide-border-light">
            {[
              { label: 'ID',            value: <span className="font-mono text-text-subtle text-[11px]">{user.id}</span> },
              { label: 'Name',          value: user.name ?? '—' },
              { label: 'Email',         value: user.email ?? '—' },
              { label: 'Email Verified', value: user.emailVerified ? new Date(user.emailVerified).toLocaleDateString() : 'No' },
              { label: 'Role',          value: <StatusBadge status={user.role} /> },
              { label: 'Plan',          value: <StatusBadge status={user.plan} /> },
              { label: 'Credits Reset', value: user.planCreditsResetAt ? new Date(user.planCreditsResetAt).toLocaleString() : '—' },
              { label: 'Joined',        value: new Date(user.createdAt).toLocaleString() },
              { label: 'Last updated',  value: new Date(user.updatedAt).toLocaleString() },
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
            <thead><tr><Th>Type</Th><Th>Bucket</Th><Th>Amount</Th><Th>Note</Th><Th>Date</Th></tr></thead>
            <tbody>
              {user.creditLedger.length === 0 ? (
                <tr><td colSpan={5}><EmptyState message="No credit transactions." /></td></tr>
              ) : user.creditLedger.map((c) => (
                <tr key={c.id} className="hover:bg-surface/40">
                  <Td><StatusBadge status={c.kind} /></Td>
                  <Td className="text-text-muted capitalize">{c.bucket}</Td>
                  <Td className={`tabular-nums font-semibold ${c.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {c.amount > 0 ? '+' : ''}{c.amount}
                  </Td>
                  <Td className="text-text-muted max-w-xs truncate">{c.description ?? '—'}</Td>
                  <Td className="text-xs text-text-muted">{new Date(c.createdAt).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableCard>
      )}

      {/* Downloads */}
      {tab === 'downloads' && (
        <TableCard>
          <Table>
            <thead><tr><Th>Tool</Th><Th>Platform</Th><Th>Status</Th><Th>Date</Th></tr></thead>
            <tbody>
              {user.downloads.length === 0 ? (
                <tr><td colSpan={4}><EmptyState message="No downloads." /></td></tr>
              ) : user.downloads.map((d) => (
                <tr key={d.id} className="hover:bg-surface/40">
                  <Td className="font-medium">{d.tool}</Td>
                  <Td className="text-text-muted">{d.platform}</Td>
                  <Td><StatusBadge status={d.status} /></Td>
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
            <thead><tr><Th>Plan</Th><Th>Status</Th><Th>Interval</Th><Th>Renews</Th><Th>Since</Th></tr></thead>
            <tbody>
              {user.subscriptions.length === 0 ? (
                <tr><td colSpan={5}><EmptyState message="No subscriptions." /></td></tr>
              ) : user.subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-surface/40">
                  <Td><StatusBadge status={s.plan} /></Td>
                  <Td><StatusBadge status={s.status} /></Td>
                  <Td className="capitalize text-text-muted">{s.interval}</Td>
                  <Td className="text-text-muted text-xs">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}</Td>
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
            <thead><tr><Th>Rating</Th><Th>Review</Th><Th>Status</Th><Th>Date</Th></tr></thead>
            <tbody>
              {user.reviews.length === 0 ? (
                <tr><td colSpan={4}><EmptyState message="No reviews." /></td></tr>
              ) : user.reviews.map((r) => (
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

      {/* Credit modal */}
      <Modal open={!!creditModal} onClose={() => setCreditModal(null)} title={creditModal === 'add' ? 'Add Credits' : 'Remove Credits'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Amount</label>
            <input type="number" min={1} value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)}
              className="w-full h-10 rounded-lg border border-border-light px-3 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" placeholder="e.g. 100" />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Reason (required)</label>
            <input value={creditReason} onChange={(e) => setCreditReason(e.target.value)}
              className="w-full h-10 rounded-lg border border-border-light px-3 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" placeholder="e.g. Refund for failed job" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setCreditModal(null)} className="px-3 py-1.5 rounded-lg text-[13px] text-text-muted hover:bg-surface transition-colors">Cancel</button>
            <Button onClick={handleCredits} loading={loading} disabled={!creditAmt || !creditReason.trim() || loading} size="sm">
              {creditModal === 'add' ? 'Add Credits' : 'Remove Credits'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change plan modal */}
      <Modal open={planModal} onClose={() => setPlanModal(false)} title="Change Plan" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">New Plan</label>
            <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)}
              className="w-full h-10 rounded-lg border border-border-light px-3 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-white">
              {['FREE', 'PRO', 'MAX', 'LIFETIME'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setPlanModal(false)} className="px-3 py-1.5 rounded-lg text-[13px] text-text-muted hover:bg-surface transition-colors">Cancel</button>
            <Button onClick={async () => { await doAction('changePlan', { plan: newPlan }); setPlanModal(false); }} loading={loading} size="sm">
              Change Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change role modal */}
      <Modal open={roleModal} onClose={() => setRoleModal(false)} title="Change Role" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">New Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
              className="w-full h-10 rounded-lg border border-border-light px-3 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-white">
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <p className="mt-2 text-xs text-text-subtle">Administrator access is applied when the user refreshes their session.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setRoleModal(false)} className="px-3 py-1.5 rounded-lg text-[13px] text-text-muted hover:bg-surface transition-colors">Cancel</button>
            <Button onClick={async () => { await doAction('changeRole', { role: newRole }); setRoleModal(false); }} loading={loading} size="sm">
              Save Role
            </Button>
          </div>
        </div>
      </Modal>
    </AdminPage>
  );
}
