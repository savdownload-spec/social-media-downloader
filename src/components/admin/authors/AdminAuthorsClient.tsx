'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UsersRound,
} from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  FilterBar,
  FilterTab,
  Pagination,
  StatCard,
  Table,
  TableCard,
  TableSkeleton,
  Td,
  Th,
  StatusBadge,
} from '@/components/admin/AdminUI';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { AuthorAvatar } from '@/components/authors/AuthorAvatar';
import type { AdminAuthorPayload } from '@/lib/author-admin';
import { formatDate } from '@/lib/utils';

type StatusFilter = 'all' | 'published' | 'draft';
type SortKey = 'updated' | 'name' | 'posts';

type PaginationMeta = { page: number; pageSize: number; total: number; totalPages: number };
type Stats = { total: number; published: number; draft: number };

type PendingDelete = { author: AdminAuthorPayload; postCount: number };

const EMPTY_STATS: Stats = { total: 0, published: 0, draft: 0 };

export function AdminAuthorsClient() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('updated');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [authors, setAuthors] = useState<AdminAuthorPayload[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteMode, setDeleteMode] = useState<'unassign' | 'reassign'>('unassign');
  const [reassignTo, setReassignTo] = useState('');
  const [reassignOptions, setReassignOptions] = useState<AdminAuthorPayload[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [query, status, sort]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    const params = new URLSearchParams({ q: query, status, sort, page: String(page) });
    fetch(`/api/admin/authors?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) throw new Error(data?.error || 'Could not load authors.');
        setAuthors(data.data as AdminAuthorPayload[]);
        setPagination(data.pagination as PaginationMeta);
        setStats(data.stats as Stats);
      })
      .catch((loadError: Error) => {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'Could not load authors.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query, status, sort, page, reloadKey]);

  const afterDelete = () => {
    if (authors.length === 1 && page > 1) setPage((current) => current - 1);
    else reload();
  };

  const togglePublished = async (author: AdminAuthorPayload) => {
    setBusyId(author.id);
    try {
      const response = await fetch(`/api/admin/authors/${author.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ published: !author.published }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Could not update the author.');
      toast.success(author.published ? 'Author unpublished' : 'Author published', author.published
        ? 'The profile is now hidden from the public site.'
        : 'The profile is now visible to the public.');
      reload();
    } catch (actionError) {
      toast.error('Could not update author', actionError instanceof Error ? actionError.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  const loadReassignOptions = async (excludeId: string) => {
    setOptionsLoading(true);
    try {
      const response = await fetch('/api/admin/authors?all=1');
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok) {
        setReassignOptions((data.data as AdminAuthorPayload[]).filter((author) => author.id !== excludeId));
      }
    } catch {
      setReassignOptions([]);
    } finally {
      setOptionsLoading(false);
    }
  };

  const requestDelete = async (author: AdminAuthorPayload) => {
    setBusyId(author.id);
    try {
      const response = await fetch(`/api/admin/authors/${author.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok) {
        toast.success('Author deleted', 'No articles were deleted.');
        afterDelete();
        return;
      }
      if (response.status === 409 && data?.code === 'AUTHOR_HAS_POSTS') {
        setPendingDelete({ author, postCount: data.data?.postCount ?? author.postCount });
        setDeleteMode('unassign');
        setReassignTo('');
        void loadReassignOptions(author.id);
        return;
      }
      throw new Error(data?.error || 'Could not delete the author.');
    } catch (deleteError) {
      toast.error('Could not delete author', deleteError instanceof Error ? deleteError.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (deleteMode === 'reassign' && !reassignTo) {
      toast.error('Choose an author', 'Select the profile that should receive these articles.');
      return;
    }

    setDeleting(true);
    try {
      const params = new URLSearchParams();
      if (deleteMode === 'reassign') params.set('reassignTo', reassignTo);
      else params.set('unassign', 'true');

      const response = await fetch(`/api/admin/authors/${pendingDelete.author.id}?${params.toString()}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Could not delete the author.');

      const reassigned = data.data?.postsReassigned ?? 0;
      toast.success(
        'Author deleted',
        reassigned > 0
          ? `${reassigned} ${reassigned === 1 ? 'article was' : 'articles were'} reassigned. Nothing was deleted.`
          : 'The articles were left in place without an author profile.',
      );
      setPendingDelete(null);
      afterDelete();
    } catch (deleteError) {
      toast.error('Could not delete author', deleteError instanceof Error ? deleteError.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="All authors" value={stats.total} icon={UsersRound} />
        <StatCard label="Published" value={stats.published} icon={Globe2} accent="green" />
        <StatCard label="Drafts" value={stats.draft} icon={FileText} accent="amber" />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Search authors by name, email, or role…">
        <div className="flex items-center gap-1.5">
          <FilterTab label="All" active={status === 'all'} onClick={() => setStatus('all')} count={stats.total} />
          <FilterTab label="Published" active={status === 'published'} onClick={() => setStatus('published')} count={stats.published} />
          <FilterTab label="Drafts" active={status === 'draft'} onClick={() => setStatus('draft')} count={stats.draft} />
        </div>
        <div className="ml-auto shrink-0">
          <label htmlFor="author-admin-sort" className="sr-only">
            Sort authors
          </label>
          <select
            id="author-admin-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-9 rounded-lg border border-border-light bg-white px-3 text-[12px] text-text focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="updated">Recently updated</option>
            <option value="name">Name A–Z</option>
            <option value="posts">Most articles</option>
          </select>
        </div>
      </FilterBar>

      {error ? (
        <TableCard>
          <ErrorState message={error} onRetry={reload} />
        </TableCard>
      ) : loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : authors.length === 0 ? (
        <TableCard>
          <EmptyState
            icon={UsersRound}
            title={query || status !== 'all' ? 'No authors match' : 'No authors yet'}
            message={
              query || status !== 'all'
                ? 'Try a different search term, or clear the filters to see every author.'
                : 'Create the first author profile to start linking articles and building the public directory.'
            }
            action={
              query || status !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatus('all');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-light bg-white px-4 py-2 text-[12px] font-medium text-text hover:bg-surface"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  href="/admin/authors/new"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-white hover:bg-primary-hover"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add New Author
                </Link>
              )
            }
          />
        </TableCard>
      ) : (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <Th>Author</Th>
                <Th className="hidden md:table-cell">Title</Th>
                <Th className="hidden sm:table-cell">Articles</Th>
                <Th>Status</Th>
                <Th className="hidden lg:table-cell">Last updated</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {authors.map((author) => (
                <tr key={author.id} className="transition-colors hover:bg-surface/40">
                  <Td>
                    <div className="flex items-center gap-3">
                      <AuthorAvatar author={author} size="sm" shape="rounded-full" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link href={`/admin/authors/${author.id}/edit`} className="truncate font-semibold text-text hover:text-primary">
                            {author.name}
                          </Link>
                          {author.isSample && (
                            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                              Sample
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-text-muted">{author.email || `/${author.slug}`}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <span className="text-text-muted">{author.role}</span>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <span className="font-semibold text-text">{author.postCount}</span>
                    <span className="ml-1 text-[11px] text-text-subtle">({author.publishedPostCount} live)</span>
                  </Td>
                  <Td>
                    <StatusBadge status={author.published ? 'PUBLISHED' : 'DRAFT'} dot />
                  </Td>
                  <Td className="hidden lg:table-cell">
                    <span className="text-[12px] text-text-muted">{formatDate(new Date(author.updatedAt))}</span>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {author.published && (
                        <Link
                          href={`/authors/${author.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View ${author.name}'s public profile`}
                          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      )}
                      <Link
                        href={`/admin/authors/${author.id}/edit`}
                        aria-label={`Edit ${author.name}`}
                        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-primary/[0.08] hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => void togglePublished(author)}
                        disabled={busyId === author.id}
                        aria-label={author.published ? `Unpublish ${author.name}` : `Publish ${author.name}`}
                        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-40"
                      >
                        {busyId === author.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : author.published ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void requestDelete(author)}
                        disabled={busyId === author.id}
                        aria-label={`Delete ${author.name}`}
                        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPage={setPage}
          />
        </TableCard>
      )}

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        title="Delete author"
        description={
          pendingDelete
            ? `${pendingDelete.author.name} is linked to ${pendingDelete.postCount} ${pendingDelete.postCount === 1 ? 'article' : 'articles'}. Articles are never deleted with an author — choose what happens to them.`
            : undefined
        }
        size="sm"
        disableBackdropClose={deleting}
        footer={
          <>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
              className="inline-flex items-center rounded-lg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleting || (deleteMode === 'reassign' && (optionsLoading || reassignOptions.length === 0))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Delete author
            </button>
          </>
        }
      >
        <div className="space-y-2.5">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-light p-3 transition-colors hover:bg-surface/60">
            <input
              type="radio"
              name="delete-mode"
              checked={deleteMode === 'unassign'}
              onChange={() => setDeleteMode('unassign')}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[13px] font-semibold text-text">Leave articles unassigned</span>
              <span className="mt-0.5 block text-[11px] leading-5 text-text-muted">
                The articles stay published; their byline keeps the name text but no longer links to a profile.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-light p-3 transition-colors hover:bg-surface/60">
            <input
              type="radio"
              name="delete-mode"
              checked={deleteMode === 'reassign'}
              onChange={() => setDeleteMode('reassign')}
              className="mt-0.5"
            />
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-text">Reassign to another author</span>
              <span className="mt-0.5 block text-[11px] leading-5 text-text-muted">
                Every linked article is moved to the selected profile before this author is removed.
              </span>
              {deleteMode === 'reassign' && (
                <span className="mt-2 block">
                  {optionsLoading ? (
                    <span className="inline-flex items-center gap-2 text-[11px] text-text-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Loading authors…
                    </span>
                  ) : reassignOptions.length ? (
                    <select
                      value={reassignTo}
                      onChange={(event) => setReassignTo(event.target.value)}
                      className="h-9 w-full rounded-lg border border-border-light bg-white px-3 text-[12px] text-text focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Choose an author…</option>
                      {reassignOptions.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-700">
                      No other author profiles exist yet. Create one first, or choose “Leave articles unassigned”.
                    </span>
                  )}
                </span>
              )}
            </span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
