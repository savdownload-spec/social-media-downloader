'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterBar, FilterTab, EmptyState, ErrorState,
  Skeleton, ActionButton,
} from './AdminUI';
import { UsersExportDrawer } from './UsersExportDrawer';
import { Checkbox } from '@/components/ui/Checkbox';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { cn } from '@/lib/utils';
import { UserCheck, UserX, Trash2, Eye, Users, Download } from 'lucide-react';

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
  const [error, setError]       = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>('all');
  const { success, error: err } = useToast();
  const { confirm }             = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search)       p.set('search', search);
    if (plan !== 'ALL') p.set('plan', plan);
    fetch(`/api/admin/users?${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setUsers(d.data.users); setTotal(d.data.total); setTotalPages(d.data.totalPages); }
        else setError(true);
      })
      .catch(() => setError(true))
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
    const ok = await confirm({ title: `Delete ${u.name ?? u.email}?`, description: 'This action cannot be undone. All user data will be permanently removed.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) { doAction(u.id, 'delete'); setSelected((s) => { const n = new Set(s); n.delete(u.id); return n; }); }
  }

  function toggleSelect(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  const pageIds = users.map((u) => u.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  function toggleSelectPage() {
    setSelected((s) => {
      const n = new Set(s);
      if (allPageSelected) pageIds.forEach((id) => n.delete(id));
      else pageIds.forEach((id) => n.add(id));
      return n;
    });
  }

  const hasFilters = !!search || plan !== 'ALL';

  return (
    <AdminPage>
      <PageHeader
        title="Users"
        description={`${total.toLocaleString()} registered users`}
        actions={
          <ActionButton variant="primary" icon={Download} onClick={() => { setExportScope('all'); setExportOpen(true); }}>
            Export Users
          </ActionButton>
        }
      />

      <FilterBar search={search} onSearch={setSearch} placeholder="Search by name or email...">
        {PLAN_FILTERS.map((f) => (
          <FilterTab key={f} label={f} active={plan === f} onClick={() => setPlan(f)} />
        ))}
      </FilterBar>

      {(selected.size > 0 || hasFilters) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {selected.size > 0 && (
            <>
              <span className="text-[12px] text-text-muted">{selected.size.toLocaleString()} users selected</span>
              <ActionButton size="sm" icon={Download} onClick={() => { setExportScope('selected'); setExportOpen(true); }}>
                Export selected
              </ActionButton>
              <button onClick={() => setSelected(new Set())} className="text-[11px] font-semibold text-text-muted hover:text-text hover:underline">
                Clear selection
              </button>
            </>
          )}
          {hasFilters && (
            <ActionButton size="sm" icon={Download} onClick={() => { setExportScope('filtered'); setExportOpen(true); }}>
              Export filtered
            </ActionButton>
          )}
        </div>
      )}

      {error ? (
        <ErrorState message="Failed to load users." onRetry={load} />
      ) : (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <Th className="w-10">
                  <Checkbox checked={allPageSelected} indeterminate={!allPageSelected && somePageSelected} onChange={toggleSelectPage} />
                </Th>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Plan</Th>
                <Th>Credits</Th>
                <Th>Downloads</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={Users}
                    title="No users found"
                    message={search ? 'Try adjusting your search or filters.' : 'Users will appear here once they register.'}
                  />
                </td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className={cn('hover:bg-surface/40 transition-colors', selected.has(u.id) && 'bg-primary/[0.03]')}>
                  <Td>
                    <Checkbox checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/[0.08] flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                        {(u.name || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text truncate">{u.name ?? '—'}</p>
                        <p className="text-[11px] text-text-muted truncate">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><StatusBadge status={u.role} /></Td>
                  <Td><StatusBadge status={u.plan} /></Td>
                  <Td className="text-text-muted tabular-nums">{u.totalCredits.toLocaleString()}</Td>
                  <Td className="text-text-muted tabular-nums">{u._count.downloads.toLocaleString()}</Td>
                  <Td className="text-text-muted text-[12px] whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/admin/users/${u.id}`} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors" title="View details">
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      {u.role === 'SUSPENDED' ? (
                        <button disabled={!!actionId} onClick={() => doAction(u.id, 'restore')} className="p-1.5 rounded-lg hover:bg-emerald-50 text-text-muted hover:text-emerald-600 transition-colors" title="Restore">
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      ) : u.role !== 'ADMIN' && (
                        <button disabled={!!actionId} onClick={() => doAction(u.id, 'suspend')} className="p-1.5 rounded-lg hover:bg-amber-50 text-text-muted hover:text-amber-600 transition-colors" title="Suspend">
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {u.role !== 'ADMIN' && (
                        <button disabled={!!actionId} onClick={() => handleDelete(u)} className="p-1.5 rounded-lg hover:bg-rose-50 text-text-muted hover:text-rose-600 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
        </TableCard>
      )}

      <UsersExportDrawer
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initialScope={exportScope}
        currentFilters={{ search, plan }}
        selectedIds={Array.from(selected)}
        onExported={() => success('Export ready — check the download.')}
      />
    </AdminPage>
  );
}
