'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td, StatusBadge,
  Pagination, FilterBar, FilterTab, EmptyState, ErrorState,
  ActionButton, Skeleton, StatCard, StatCardSkeleton,
} from './AdminUI';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { ContentStudioShell, type AdminPost } from './content-studio/ContentStudioShell';
import {
  Pencil, Trash2, Eye, EyeOff, Plus, FileText, FileWarning, FileCheck2,
  Gauge, BookOpenCheck, ImageOff, Link2Off, X,
} from 'lucide-react';

type Post = AdminPost;

const STATUS_FILTERS = ['ALL', 'published', 'draft'];
const ATTENTION_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Needs Attention', value: 'needsAttention' },
  { label: 'Good SEO', value: 'goodSeo' },
];
const ATTENTION_LABELS: Record<string, string> = {
  needsAttention: 'Posts needing attention (SEO score under 60)',
  goodSeo: 'Posts with good SEO (score 80+)',
  missingMetaDescription: 'Posts missing a meta description',
  missingFeaturedImage: 'Posts missing a featured image',
  missingInternalLinks: 'Posts with no internal links',
};
const SORT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Newest', value: 'createdAt' },
  { label: 'Recently Updated', value: 'updatedAt' },
  { label: 'Published Date', value: 'publishedAt' },
  { label: 'SEO Score', value: 'seoScore' },
  { label: 'Readability', value: 'readabilityScore' },
];

type Stats = {
  total: number; published: number; drafts: number; avgSeoScore: number; avgReadabilityScore: number;
  missingMetaDescription: number; missingFeaturedImage: number; missingAltText: number; missingInternalLinks: number;
  recentlyUpdated: { id: string; title: string; slug: string; updatedAt: string; seoScore: number | null }[];
  needsAttention: { id: string; title: string; slug: string; seoScore: number | null; published: boolean }[];
};

function scoreBadgeCls(score: number | null | undefined) {
  if (score === null || score === undefined) return 'bg-surface text-text-muted';
  if (score >= 80) return 'bg-emerald-50 text-emerald-700';
  if (score >= 50) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}

export function AdminContentClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [attention, setAttention] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const { success, error: err } = useToast();
  const { confirm } = useConfirm();

  function jumpToFilter(value: string) {
    setSearch('');
    setFilter('ALL');
    setAttention(value);
    requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), pageSize: '20', sortBy });
    if (search) params.set('search', search);
    if (filter !== 'ALL') params.set('status', filter);
    if (attention) params.set('attention', attention);
    fetch(`/api/admin/content?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setPosts(d.data.posts); setTotal(d.data.total); setTotalPages(d.data.totalPages); } else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, search, filter, attention, sortBy]);

  const loadStats = useCallback(() => {
    fetch('/api/admin/content/stats').then((r) => r.json()).then((d) => { if (d.ok) setStats(d.data); }).catch(() => undefined);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [search, filter, attention, sortBy]);

  function openCreate() { setEditPost(null); setEditorOpen(true); }
  function openEdit(post: Post) { setEditPost(post); setEditorOpen(true); }
  function closeEditor() { setEditorOpen(false); setEditPost(null); }
  function handleSaved() { load(); loadStats(); }

  async function togglePublish(post: Post) {
    const r = await fetch(`/api/admin/content/${post.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ published: !post.published }) });
    const d = await r.json().catch(() => null);
    if (d?.ok) { success(post.published ? 'Unpublished' : 'Published'); load(); loadStats(); } else err('Failed');
  }

  async function handleDelete(post: Post) {
    const ok = await confirm({ title: `Delete "${post.title}"?`, description: 'This action cannot be undone. The post will be permanently removed.', confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    const r = await fetch(`/api/admin/content/${post.id}`, { method: 'DELETE' });
    const d = await r.json().catch(() => null);
    if (d?.ok) { success('Post deleted'); load(); loadStats(); } else err('Delete failed');
  }

  if (editorOpen) {
    return <ContentStudioShell initialPost={editPost} onClose={closeEditor} onSaved={handleSaved} />;
  }

  return (
    <AdminPage>
      <PageHeader
        title="Content Studio"
        description={`${total} posts`}
        actions={<ActionButton variant="primary" icon={Plus} onClick={openCreate}>New Article</ActionButton>}
      />

      {/* Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {!stats ? (
          Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Posts" value={stats.total} icon={FileText} accent="purple" />
            <StatCard label="Published" value={stats.published} icon={FileCheck2} accent="green" />
            <StatCard label="Drafts" value={stats.drafts} icon={FileWarning} accent="amber" />
            <StatCard label="Avg SEO Score" value={stats.avgSeoScore} icon={Gauge} accent="blue" />
            <StatCard label="Avg Readability" value={stats.avgReadabilityScore} icon={BookOpenCheck} accent="blue" />
            <button type="button" onClick={() => jumpToFilter('missingMetaDescription')} className="text-left rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" title="Show posts missing a meta description">
              <StatCard label="Missing Meta Description" value={stats.missingMetaDescription} icon={FileWarning} accent="rose" />
            </button>
            <button type="button" onClick={() => jumpToFilter('missingFeaturedImage')} className="text-left rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" title="Show posts missing a featured image">
              <StatCard label="Missing Featured Image" value={stats.missingFeaturedImage} icon={ImageOff} accent="rose" />
            </button>
            <button type="button" onClick={() => jumpToFilter('missingInternalLinks')} className="text-left rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" title="Show posts with no internal links">
              <StatCard label="Missing Internal Links" value={stats.missingInternalLinks} icon={Link2Off} accent="rose" />
            </button>
          </>
        )}
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Search posts...">
        {STATUS_FILTERS.map((s) => (
          <FilterTab key={s} label={s === 'ALL' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} active={filter === s} onClick={() => setFilter(s)} />
        ))}
        <span className="w-px h-6 bg-border-light mx-1 self-center" />
        {ATTENTION_FILTERS.map((a) => (
          <FilterTab key={a.value} label={a.label} active={attention === a.value} onClick={() => setAttention(a.value)} />
        ))}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-8 rounded-lg border border-border-light bg-white px-2.5 text-[12px] text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
        </select>
      </FilterBar>

      <div ref={tableRef} />
      {attention && ATTENTION_LABELS[attention] && (
        <div className="flex items-center justify-between gap-3 mb-3 px-4 py-2.5 rounded-xl bg-primary/[0.06] border border-primary/20">
          <p className="text-[12px] font-medium text-primary">
            Filtered: {ATTENTION_LABELS[attention]} ({total})
          </p>
          <button type="button" onClick={() => setAttention('')} className="flex items-center gap-1 text-[12px] font-medium text-text-muted hover:text-text">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}

      {error ? (
        <ErrorState message="Failed to load posts." onRetry={load} />
      ) : (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Category</Th>
                <Th>Author</Th>
                <Th>SEO Score</Th>
                <Th>Readability</Th>
                <Th>Words</Th>
                <Th>Updated</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : posts.length === 0 ? (
                <tr><td colSpan={9}>
                  <EmptyState icon={FileText} title="No posts yet" message="Create your first article to get started." action={<ActionButton variant="primary" icon={Plus} onClick={openCreate}>New Article</ActionButton>} />
                </td></tr>
              ) : posts.map((post) => (
                <tr key={post.id} className="hover:bg-surface/40 transition-colors">
                  <Td>
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">{post.title}</p>
                      <p className="text-[11px] text-text-muted truncate">/blog/{post.slug}</p>
                    </div>
                  </Td>
                  <Td><StatusBadge status={post.published ? 'PUBLISHED' : (post.scheduledAt && new Date(post.scheduledAt) > new Date() ? 'SCHEDULED' : 'DRAFT')} dot /></Td>
                  <Td><span className="text-[12px] text-text-muted bg-surface px-2 py-0.5 rounded-md">{post.category || 'Guides'}</span></Td>
                  <Td className="text-[12px] text-text-muted">{post.author}</Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${scoreBadgeCls(post.seoScore)}`}>{post.seoScore ?? '—'}</span></Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${scoreBadgeCls(post.readabilityScore)}`}>{post.readabilityScore ?? '—'}</span></Td>
                  <Td className="text-[12px] text-text-muted tabular-nums">{post.wordCount ?? '—'}</Td>
                  <Td className="text-[12px] text-text-muted whitespace-nowrap tabular-nums">{new Date(post.updatedAt).toLocaleDateString()}</Td>
                  <Td>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(post)} className="p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-primary transition-colors" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => togglePublish(post)} className="p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-emerald-600 transition-colors" title={post.published ? 'Unpublish' : 'Publish'}>
                        {post.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => handleDelete(post)} className="p-1.5 rounded-lg text-text-muted hover:bg-rose-50 hover:text-rose-600 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
        </TableCard>
      )}
    </AdminPage>
  );
}
