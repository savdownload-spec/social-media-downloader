'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ClipboardCopy, Copy, ExternalLink, FileText, MoreHorizontal, Pencil, Play, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { AdminPage, EmptyState, ErrorState, PageHeader, SectionCard, Skeleton, Table, Td, Th } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';
import { PlatformMark } from './PlatformMark';
import { SocialStatusBadge } from './SocialStatusBadge';
import { apiGet, apiSend } from './api';
import { can, useSocialBootstrap } from './useBootstrap';
import type { PostDTO } from './types';
import { formatDateTimeInTimeZone } from '@/lib/social/timezone';
import { getPlatform } from '@/lib/social/platforms';
import { buildManualChecklist, composeManualText, manualHref, toMarkdownPost } from '@/lib/social/manual';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'failed', label: 'Failed' },
  { id: 'attention', label: 'Needs attention' },
];

const MANUAL_STATUSES = ['MANUAL_ACTION_REQUIRED', 'NEEDS_AUTHORIZATION', 'FAILED'];

type ListData = { posts: PostDTO[]; total: number; page: number; pageSize: number; counts: Record<string, number> };

export function SocialPosts() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: bootstrap, error: bootstrapError } = useSocialBootstrap();
  const [tab, setTab] = useState(params.get('tab') ?? 'all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [manualPost, setManualPost] = useState<PostDTO | null>(null);
  const [confirmUrl, setConfirmUrl] = useState<Record<string, string>>({});
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (tab !== 'all') query.set('tab', tab);
      if (search.trim()) query.set('search', search.trim());
      setData(await apiGet<ListData>(`/api/admin/social/posts?${query.toString()}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Posts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, search, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(post: PostDTO, kind: 'publish' | 'cancel' | 'duplicate' | 'delete') {
    if (kind === 'cancel' || kind === 'delete') {
      const approved = await confirm({
        title: kind === 'cancel' ? 'Cancel this post?' : 'Delete this post?',
        description: kind === 'cancel'
          ? 'Queued work for this post is cancelled. Nothing is sent to a platform.'
          : 'The draft and its variants are permanently removed.',
        confirmLabel: kind === 'cancel' ? 'Cancel post' : 'Delete',
        variant: 'danger',
      });
      if (!approved) return;
    }
    setBusyId(post.id);
    try {
      if (kind === 'publish') {
        const result = await apiSend<{ run: { postStatus: string } | null }>(`/api/admin/social/posts/${post.id}/publish`, 'POST');
        success('Publishing finished', `Result: ${result.run?.postStatus ?? 'queued'}. Check each platform's status below.`);
      } else if (kind === 'cancel') {
        await apiSend(`/api/admin/social/posts/${post.id}/cancel`, 'POST');
        success('Post cancelled');
      } else if (kind === 'duplicate') {
        await apiSend(`/api/admin/social/posts/${post.id}/duplicate`, 'POST');
        success('Draft duplicated');
      } else {
        await apiSend(`/api/admin/social/posts/${post.id}`, 'DELETE');
        success('Post deleted');
      }
      await load();
    } catch (cause) {
      toastError('Action failed', cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmManual(variantId: string, post: PostDTO) {
    const url = (confirmUrl[variantId] ?? '').trim();
    if (!url) return;
    try {
      await apiSend(`/api/admin/social/posts/${post.id}/variants/${variantId}/manual`, 'POST', { publishedUrl: url });
      success('Marked published', 'The public URL was saved with the variant.');
      setManualPost(null);
      setConfirmUrl({});
      await load();
    } catch (cause) {
      toastError('Could not confirm', cause instanceof Error ? cause.message : undefined);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      success(`${label} copied`);
    } catch {
      toastError('Copy failed');
    }
  }

  if (bootstrapError || !bootstrap) {
    return <AdminPage><ErrorState message={bootstrapError ?? 'Loading…'} /></AdminPage>;
  }

  const tz = bootstrap.config.timezone;
  const canPublish = can(bootstrap.actor.capabilities, 'publish');
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Social Media"
        title="Posts"
        description="Every draft, schedule, publication, and manual action in one list."
        actions={
          <>
            <button onClick={() => void load()} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <Button size="sm" onClick={() => router.push('/admin/social/compose')}>Create post</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            onClick={() => { setTab(entry.id); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              tab === entry.id ? 'bg-primary/[0.08] text-primary' : 'text-text-muted hover:bg-surface'
            }`}
          >
            {entry.label}
            {entry.id === 'attention' && (data?.counts.FAILED ?? 0) + (data?.counts.NEEDS_AUTHORIZATION ?? 0) + (data?.counts.MANUAL_ACTION_REQUIRED ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] font-bold text-rose-600">
                {(data?.counts.FAILED ?? 0) + (data?.counts.NEEDS_AUTHORIZATION ?? 0) + (data?.counts.MANUAL_ACTION_REQUIRED ?? 0)}
              </span>
            )}
          </button>
        ))}
        <input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder="Search caption or title"
          className="ml-auto w-full sm:w-64 rounded-lg border border-border px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading && !data ? (
        <Skeleton className="h-72" />
      ) : !data || data.posts.length === 0 ? (
        <div className="bg-white border border-border-light rounded-xl">
          <EmptyState
            icon={FileText}
            title={tab === 'all' ? 'No posts yet' : 'Nothing in this tab'}
            message={tab === 'attention' ? 'No variants need attention. Failed and manual items appear here.' : 'Create a post to start your publishing workflow.'}
            action={<Button size="sm" onClick={() => router.push('/admin/social/compose')}>Create post</Button>}
          />
        </div>
      ) : (
        <>
          <SectionCard className="overflow-hidden">
            <Table>
              <thead>
                <tr>
                  <Th>Post</Th>
                  <Th>Platforms</Th>
                  <Th>Schedule</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.posts.map((post) => {
                  const manual = post.variants.some((variant) => MANUAL_STATUSES.includes(variant.status));
                  const editable = ['DRAFT', 'SCHEDULED', 'CANCELLED'].includes(post.status);
                  return (
                    <tr key={post.id}>
                      <Td className="max-w-[360px]">
                        <p className="font-medium text-text truncate">{post.title || post.caption || 'Untitled post'}</p>
                        <p className="text-[11px] text-text-muted truncate">
                          {post.caption.slice(0, 90)}{post.caption.length > 90 ? '…' : ''}
                        </p>
                      </Td>
                      <Td>
                        <div className="flex -space-x-1.5">
                          {post.variants.slice(0, 5).map((variant) => (
                            <PlatformMark key={variant.platform} platform={variant.platform} size="sm" className="ring-2 ring-white" title={`${getPlatform(variant.platform)?.short}: ${variant.status}`} />
                          ))}
                          {post.variants.length > 5 && <span className="text-[10px] text-text-muted self-center pl-2">+{post.variants.length - 5}</span>}
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-text-muted">
                        {post.scheduledAt ? formatDateTimeInTimeZone(post.scheduledAt, tz) : post.publishedAt ? formatDateTimeInTimeZone(post.publishedAt, tz) : '—'}
                      </Td>
                      <Td><SocialStatusBadge status={post.status} /></Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          {editable && (
                            <button onClick={() => router.push(`/admin/social/compose?id=${post.id}`)} className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface" aria-label="Edit post">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canPublish && ['DRAFT', 'SCHEDULED', 'FAILED', 'PARTIAL', 'NEEDS_AUTHORIZATION', 'MANUAL_ACTION_REQUIRED'].includes(post.status) && (
                            <button onClick={() => void action(post, 'publish')} disabled={busyId === post.id} className="p-1.5 rounded-lg text-text-muted hover:text-emerald-600 hover:bg-emerald-50" aria-label="Publish now">
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {manual && (
                            <button onClick={() => setManualPost(post)} className="p-1.5 rounded-lg text-text-muted hover:text-cyan-700 hover:bg-cyan-50" aria-label="Manual publishing tools">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => void action(post, 'duplicate')} disabled={busyId === post.id} className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface" aria-label="Duplicate post">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {canPublish && ['SCHEDULED', 'QUEUED', 'DRAFT'].includes(post.status) && (
                            <button onClick={() => void action(post, 'cancel')} disabled={busyId === post.id} className="p-1.5 rounded-lg text-text-muted hover:text-amber-600 hover:bg-amber-50" aria-label="Cancel post">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canPublish && ['DRAFT', 'SCHEDULED', 'CANCELLED'].includes(post.status) && (
                            <button onClick={() => void action(post, 'delete')} disabled={busyId === post.id} className="p-1.5 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50" aria-label="Delete post">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </SectionCard>
          <div className="flex items-center justify-between mt-4 text-[12px] text-text-muted">
            <span>{data.total} post{data.total === 1 ? '' : 's'} · page {data.page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-surface">Previous</button>
              <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-surface">Next</button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={Boolean(manualPost)}
        onClose={() => { setManualPost(null); setConfirmUrl({}); }}
        title="Manual publishing"
        description="Copy or export, publish in the official composer, then confirm the public URL. Nothing is marked published before that."
        size="lg"
      >
        {manualPost && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {manualPost.variants
              .filter((variant) => MANUAL_STATUSES.includes(variant.status) || variant.status === 'PUBLISHED')
              .map((variant) => {
                const def = getPlatform(variant.platform);
                const caption = variant.caption.trim() || manualPost.caption;
                const hashtags = variant.hashtags ?? manualPost.hashtags;
                const linkUrl = variant.linkUrl ?? manualPost.linkUrl;
                const content = { title: variant.title ?? manualPost.title, caption, hashtags, linkUrl };
                const text = composeManualText(content);
                const markdown = toMarkdownPost(content);
                const href = manualHref(variant.platform as Parameters<typeof manualHref>[0], content);
                return (
                  <div key={variant.id} className="rounded-xl border border-border-light p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <PlatformMark platform={variant.platform} size="sm" />
                      <span className="text-[12px] font-semibold text-text">{def?.short ?? variant.platform}</span>
                      <span className="ml-auto"><SocialStatusBadge status={variant.status} /></span>
                    </div>
                    {variant.status === 'PUBLISHED' ? (
                      <p className="text-[12px] text-emerald-700">
                        Published{variant.publishedUrl ? <> · <a className="underline" href={variant.publishedUrl} target="_blank" rel="noreferrer">{variant.publishedUrl}</a></> : null}
                      </p>
                    ) : (
                      <>
                        <pre className="whitespace-pre-wrap text-[11px] text-text-muted bg-surface/60 rounded-lg p-2 max-h-28 overflow-y-auto">{text}</pre>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Button size="sm" variant="outline" onClick={() => void copy(text, 'Text')}><ClipboardCopy className="w-3.5 h-3.5" /> Copy text</Button>
                          <Button size="sm" variant="outline" onClick={() => void copy(markdown, 'Markdown')}><FileText className="w-3.5 h-3.5" /> Markdown</Button>
                          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-xl border border-border bg-white hover:bg-surface">
                            <ExternalLink className="w-3.5 h-3.5" /> Official composer
                          </a>
                        </div>
                        <ul className="mt-2 text-[10px] text-text-subtle list-disc pl-4 space-y-0.5">
                          {buildManualChecklist(variant.platform as Parameters<typeof buildManualChecklist>[0]).map((step) => <li key={step}>{step}</li>)}
                        </ul>
                        <div className="mt-2 flex flex-col sm:flex-row gap-2">
                          <input
                            value={confirmUrl[variant.id] ?? ''}
                            onChange={(event) => setConfirmUrl((current) => ({ ...current, [variant.id]: event.target.value }))}
                            placeholder="https://… public post URL"
                            className="flex-1 rounded-lg border border-border px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                            aria-label={`Public URL for ${def?.short ?? variant.platform}`}
                          />
                          <Button size="sm" onClick={() => void confirmManual(variant.id, manualPost)} disabled={!confirmUrl[variant.id]?.trim()}>
                            <Check className="w-3.5 h-3.5" /> Confirm published
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </Modal>
    </AdminPage>
  );
}
