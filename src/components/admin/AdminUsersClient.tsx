'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterBar, FilterTab, EmptyState,
} from './AdminUI';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { UserCheck, UserX, Trash2, Eye } from 'lucide-react';

const PLAN_FILTERS = ['ALL', 'FREE', 'PRO', 'MAX', 'LIFETIME'];

type User = {
  id: string; name: string | null; email: string | null; role: string;
  plan: string; totalCredits: number; createdAt: string; updatedAt: string;
  _count: { downloads: number; subscriptions: number };
};

export function AdminUsersClient() {
  const [users, setUsers]       = useState<User[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]     = useState('');
  const [plan, setPlan]         = useState('ALL');
  const [loading, setLoading]   = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const { success, error: err } = useToast();
  const { confirm }             = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search)       p.set('search', search);
    if (plan !== 'ALL') p.set('plan', plan);
    fetch(`/api/admin/users?${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setUsers(d.data.users); setTotal(d.data.total); setTotalPages(d.data.totalPages); }
      })
      .finally(() => setLoading(false));
  }, [page, search, plan]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, plan]);

  async function doAction(id: string, action: string, extra?: Record<string, unknown>) {
    setActionId(id + action);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json().catch(() => null);
      if (!d?.ok) { err('Action failed', d?.error); return; }
      success(d.data.message);
      load();
    } finally { setActionId(null); }
  }

  async function handleDelete(u: User) {
    const ok = await confirm({ title: `Delete ${u.name ?? u.email}?`, description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) doAction(u.id, 'delete');
  }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin" title="Users" description={`${total.toLocaleString()} total users`} />

      <FilterBar search={search} onSearch={setSearch} placeholder="Search name or email…">
        {PLAN_FILTERS.map((f) => (
          <FilterTab key={f} label={f} active={plan === f} onClick={() => setPlan(f)} />
        ))}
      </FilterBar>

      <TableCard>
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Plan</Th>
              <Th>Credits</Th>
              <Th>Downloads</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-10 mx-4 my-1 rounded-lg bg-surface animate-pulse" /></td></tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={7}><EmptyState message="No users found." /></td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-surface/40 transition-colors">
                <Td>
                  <div>
                    <p className="font-medium text-text">{u.name ?? '—'}</p>
                    <p className="text-xs text-text-muted">{u.email}</p>
                  </div>
                </Td>
                <Td><StatusBadge status={u.role} /></Td>
                <Td><StatusBadge status={u.plan} /></Td>
                <Td className="text-text-muted">{u.totalCredits.toLocaleString()}</Td>
                <Td className="text-text-muted">{u._count.downloads.toLocaleString()}</Td>
                <Td className="text-text-muted text-xs">{new Date(u.createdAt).toLocaleDateString()}</Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <Link href={`/admin/users/${u.id}`} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors" title="View">
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    {u.role === 'SUSPENDED' ? (
                      <button disabled={!!actionId} onClick={() => doAction(u.id, 'restore')} className="p-1.5 rounded-lg hover:bg-accent-light text-text-muted hover:text-accent transition-colors" title="Restore">
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button disabled={!!actionId} onClick={() => doAction(u.id, 'suspend')} className="p-1.5 rounded-lg hover:bg-amber-50 text-text-muted hover:text-amber-600 transition-colors" title="Suspend">
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button disabled={!!actionId} onClick={() => handleDelete(u)} className="p-1.5 rounded-lg hover:bg-rose-50 text-text-muted hover:text-rose-600 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
