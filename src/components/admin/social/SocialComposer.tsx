'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ImagePlus,
  Info,
  LoaderCircle,
  Send,
  X,
} from 'lucide-react';
import { AdminPage, ErrorState, PageHeader, SectionCard, Skeleton } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { PlatformMark } from './PlatformMark';
import { SocialStatusBadge } from './SocialStatusBadge';
import { apiGet, apiSend } from './api';
import { can, useSocialBootstrap } from './useBootstrap';
import { ACCEPTED_UPLOADS, uploadSocialFile } from './upload';
import type { AccountDTO, MediaAsset, PostDTO } from './types';
import { getPlatform, type PlatformId } from '@/lib/social/platforms';
import { composeFullText, effectiveLength, validatePostForSubmission } from '@/lib/social/validation';
import { utcToZonedInputValue, zonedDateTimeToUtc } from '@/lib/social/timezone';
import { formatBytes } from '@/lib/social/media';

type VariantState = {
  caption: string;
  title: string;
  hashtags: string;
  linkUrl: string;
  board: string;
  subreddit: string;
  visibility: string;
};

const EMPTY_VARIANT: VariantState = {
  caption: '',
  title: '',
  hashtags: '',
  linkUrl: '',
  board: '',
  subreddit: '',
  visibility: '',
};

type Mode = 'draft' | 'schedule' | 'publish';

export function SocialComposer() {
  const router = useRouter();
  const params = useSearchParams();
  const editingId = params.get('id');
  const presetDate = params.get('date');

  const { data: bootstrap, error: bootstrapError, loading: bootstrapLoading } = useSocialBootstrap();
  const { success, error: toastError, info } = useToast();

  const [post, setPost] = useState<PostDTO | null>(null);
  const [loadingPost, setLoadingPost] = useState(Boolean(editingId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [variants, setVariants] = useState<Record<string, VariantState>>({});
  const [active, setActive] = useState<string>('');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [submitting, setSubmitting] = useState<Mode | null>(null);
  const [result, setResult] = useState<PostDTO | null>(null);

  const mergeAssets = useCallback((incoming: MediaAsset[]) => {
    setMedia((current) => {
      const map = new Map(current.map((asset) => [asset.id, asset]));
      for (const asset of incoming) map.set(asset.id, asset);
      return [...map.values()];
    });
  }, []);

  const loadLibrary = useCallback(async () => {
    const data = await apiGet<{ assets: MediaAsset[] }>('/api/admin/social/media?pageSize=60');
    mergeAssets(data.assets);
  }, [mergeAssets]);

  useEffect(() => {
    if (!bootstrap) return;
    setTimezone(bootstrap.config.timezone);
    if (!editingId) {
      setHashtags(bootstrap.config.defaultHashtags);
      const initial = bootstrap.config.defaultPlatforms.filter((entry) => getPlatform(entry));
      setPlatforms(initial);
      setVariants(Object.fromEntries(initial.map((entry) => [entry, { ...EMPTY_VARIANT }])));
      setActive(initial[0] ?? '');
      if (presetDate) setScheduledLocal(`${presetDate}T09:00`);
    }
  }, [bootstrap, editingId, presetDate]);

  useEffect(() => {
    void loadLibrary().catch(() => null);
  }, [loadLibrary]);

  useEffect(() => {
    void apiGet<{ accounts: AccountDTO[] }>('/api/admin/social/accounts')
      .then((data) => setAccounts(data.accounts))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    setLoadingPost(true);
    setLoadError(null);
    void (async () => {
      try {
        const data = await apiGet<{ post: PostDTO }>(`/api/admin/social/posts/${editingId}`);
        if (cancelled) return;
        const loaded = data.post;
        setPost(loaded);
        setTitle(loaded.title ?? '');
        setCaption(loaded.caption);
        setHashtags(loaded.hashtags ?? '');
        setLinkUrl(loaded.linkUrl ?? '');
        setTimezone(loaded.timezone);
        setScheduledLocal(loaded.scheduledAt ? utcToZonedInputValue(loaded.scheduledAt, loaded.timezone) : '');
        setPlatforms(loaded.variants.map((variant) => variant.platform));
        setVariants(
          Object.fromEntries(
            loaded.variants.map((variant) => [
              variant.platform,
              {
                caption: variant.caption ?? '',
                title: variant.title ?? '',
                hashtags: variant.hashtags ?? '',
                linkUrl: variant.linkUrl ?? '',
                board: typeof (variant.options as Record<string, unknown>)?.board === 'string' ? String((variant.options as Record<string, unknown>).board) : '',
                subreddit: typeof (variant.options as Record<string, unknown>)?.subreddit === 'string' ? String((variant.options as Record<string, unknown>).subreddit) : '',
                visibility: typeof (variant.options as Record<string, unknown>)?.visibility === 'string' ? String((variant.options as Record<string, unknown>).visibility) : '',
              },
            ]),
          ),
        );
        setActive(loaded.variants[0]?.platform ?? '');
        setSelectedMedia(loaded.media.map((asset) => asset.id));
        if (loaded.media.length > 0) {
          const ids = loaded.media.map((asset) => asset.id).join(',');
          const extra = await apiGet<{ assets: MediaAsset[] }>(`/api/admin/social/media?ids=${encodeURIComponent(ids)}`);
          mergeAssets(extra.assets);
        }
      } catch (cause) {
        if (!cancelled) setLoadError(cause instanceof Error ? cause.message : 'The post could not be loaded.');
      } finally {
        if (!cancelled) setLoadingPost(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, mergeAssets]);

  const connectedPlatforms = useMemo(
    () => new Set(accounts.filter((account) => account.status === 'CONNECTED' || account.status === 'EXPIRING').map((account) => account.platform)),
    [accounts],
  );

  const pinterestBoards = useMemo(() => {
    const account = accounts.find(
      (entry) => entry.platform === 'PINTEREST' && (entry.status === 'CONNECTED' || entry.status === 'EXPIRING'),
    );
    const boards = (account?.metadata as { boards?: unknown } | null)?.boards;
    if (!Array.isArray(boards)) return [] as Array<{ id: string; name: string }>;
    return boards
      .filter((board): board is { id: string; name: string } => Boolean(board) && typeof board === 'object')
      .map((board) => ({ id: String(board.id), name: String((board as { name?: unknown }).name ?? board.id) }));
  }, [accounts]);
  const selectedAssets = useMemo(
    () => selectedMedia.map((id) => media.find((asset) => asset.id === id)).filter((asset): asset is MediaAsset => Boolean(asset)),
    [selectedMedia, media],
  );

  const validation = useMemo(() => {
    const drafts = platforms.map((platform) => {
      const variant = variants[platform] ?? EMPTY_VARIANT;
      return {
        platform: platform as PlatformId,
        caption: variant.caption,
        title: variant.title,
        hashtags: variant.hashtags,
        linkUrl: variant.linkUrl,
        options: {
          ...(variant.board ? { board: variant.board } : {}),
          ...(variant.subreddit ? { subreddit: variant.subreddit } : {}),
          ...(variant.visibility ? { visibility: variant.visibility } : {}),
        },
      };
    });
    const contexts = Object.fromEntries(
      platforms.map((platform) => {
        const variant = variants[platform] ?? EMPTY_VARIANT;
        return [
          platform,
          {
            accountConnected: connectedPlatforms.has(platform),
            optionValues: { board: variant.board, subreddit: variant.subreddit, visibility: variant.visibility },
          },
        ];
      }),
    );
    return validatePostForSubmission(
      {
        caption,
        title,
        hashtags,
        linkUrl,
        media: selectedAssets.map((asset) => ({
          id: asset.id,
          kind: asset.kind === 'VIDEO' ? ('VIDEO' as const) : ('IMAGE' as const),
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          sizeBytes: asset.sizeBytes,
        })),
      },
      drafts,
      contexts,
    );
  }, [platforms, variants, connectedPlatforms, caption, title, hashtags, linkUrl, selectedAssets]);

  const activeVariant = variants[active] ?? EMPTY_VARIANT;
  const activeDef = active ? getPlatform(active) : null;
  const activeResult = validation.results.find((entry) => entry.platform === active);
  const activeCaption = activeVariant.caption.trim() || caption;
  const activeHashtags = activeVariant.hashtags || hashtags;
  const activeLink = activeVariant.linkUrl || linkUrl;
  const activeText = composeFullText(activeCaption, activeHashtags, activeLink);
  const canPublish = can(bootstrap?.actor.capabilities, 'publish');

  function updateVariant(patch: Partial<VariantState>) {
    if (!active) return;
    setVariants((current) => ({ ...current, [active]: { ...(current[active] ?? EMPTY_VARIANT), ...patch } }));
  }

  function togglePlatform(platform: string) {
    if (platforms.includes(platform)) {
      const next = platforms.filter((entry) => entry !== platform);
      setPlatforms(next);
      if (active === platform) setActive(next[0] ?? '');
      return;
    }
    setPlatforms([...platforms, platform]);
    setVariants((state) => (state[platform] ? state : { ...state, [platform]: { ...EMPTY_VARIANT } }));
    if (!active) setActive(platform);
  }

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploading(list.length);
    const newIds: string[] = [];
    for (const file of list) {
      try {
        const asset = await uploadSocialFile(file);
        mergeAssets([asset as MediaAsset]);
        newIds.push(asset.id);
      } catch (cause) {
        toastError(`Could not upload ${file.name}`, cause instanceof Error ? cause.message : undefined);
      } finally {
        setUploading((count) => count - 1);
      }
    }
    if (newIds.length > 0) {
      setSelectedMedia((current) => [...new Set([...current, ...newIds])].slice(0, 20));
      success(`${newIds.length} asset${newIds.length === 1 ? '' : 's'} uploaded and attached`);
    }
  }

  async function submit(mode: Mode) {
    if (!bootstrap) return;
    if (platforms.length === 0) {
      toastError('Select at least one platform');
      return;
    }
    if (mode === 'schedule' && !scheduledLocal) {
      toastError('Choose a date and time before scheduling');
      return;
    }
    if (mode !== 'draft' && validation.blocking) {
      const first = validation.results.flatMap((entry) => entry.issues.filter((issue) => issue.level === 'error').map((issue) => `${getPlatform(entry.platform)?.short}: ${issue.message}`))[0];
      toastError('Fix validation errors first', first);
      return;
    }

    let scheduledAt: string | null = null;
    if (mode === 'schedule') {
      try {
        scheduledAt = zonedDateTimeToUtc(scheduledLocal, timezone).toISOString();
      } catch {
        toastError('Invalid schedule date');
        return;
      }
    }

    const payload = {
      mode,
      title: title.trim() || null,
      caption,
      hashtags: hashtags.trim() || null,
      linkUrl: linkUrl.trim() || null,
      timezone,
      scheduledAt,
      mediaIds: selectedMedia,
      variants: platforms.map((platform) => {
        const variant = variants[platform] ?? EMPTY_VARIANT;
        return {
          platform,
          caption: variant.caption.trim() || null,
          title: variant.title.trim() || null,
          hashtags: variant.hashtags.trim() || null,
          linkUrl: variant.linkUrl.trim() || null,
          options: {
            ...(variant.board.trim() ? { board: variant.board.trim() } : {}),
            ...(variant.subreddit.trim() ? { subreddit: variant.subreddit.trim() } : {}),
            ...(variant.visibility.trim() ? { visibility: variant.visibility.trim() } : {}),
          },
        };
      }),
    };

    setSubmitting(mode);
    try {
      if (editingId) {
        const data = await apiSend<{ post: PostDTO }>(`/api/admin/social/posts/${editingId}`, 'PATCH', payload);
        if (mode === 'publish') {
          const published = await apiSend<{ post: PostDTO }>(`/api/admin/social/posts/${editingId}/publish`, 'POST');
          setPost(published.post);
          setResult(published.post);
        } else {
          success(mode === 'schedule' && !canPublish ? 'Schedule proposed' : 'Post updated');
          setPost(data.post);
          router.push('/admin/social/posts');
        }
      } else {
        const data = await apiSend<{ post: PostDTO; run: { postStatus: string } | null }>('/api/admin/social/posts', 'POST', payload);
        if (mode === 'publish') {
          setResult(data.post);
        } else {
          success(mode === 'schedule' ? 'Post scheduled' : 'Draft saved');
          router.push('/admin/social/posts');
        }
      }
    } catch (cause) {
      toastError('Could not save the post', cause instanceof Error ? cause.message : undefined);
    } finally {
      setSubmitting(null);
    }
  }

  if (bootstrapError) {
    return <AdminPage><ErrorState message={bootstrapError} /></AdminPage>;
  }
  if ((bootstrapLoading && !bootstrap) || loadingPost) {
    return (
      <AdminPage>
        <Skeleton className="h-8 w-56 mb-6" />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Skeleton className="h-[480px] xl:col-span-2" />
          <Skeleton className="h-[480px]" />
        </div>
      </AdminPage>
    );
  }
  if (!bootstrap) return <AdminPage><ErrorState message="Composer is unavailable." /></AdminPage>;
  if (loadError) return <AdminPage><ErrorState message={loadError} /></AdminPage>;

  const editingLocked = post ? !['DRAFT', 'SCHEDULED', 'CANCELLED'].includes(post.status) : false;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Social Media"
        title={editingId ? 'Edit post' : 'Create post'}
        description="Write once, tailor each platform, then schedule or publish."
        actions={
          <button onClick={() => router.push('/admin/social/posts')} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-text-muted hover:text-text">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to posts
          </button>
        }
      />

      {editingLocked && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          This post has already been attempted or published, so its content is read-only. Duplicate it to make changes.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 space-y-4">
          <SectionCard title="Content" subtitle="Master copy used by platforms that inherit it">
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-text">Title <span className="text-text-subtle font-normal">(optional — required by Pinterest)</span></span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={editingLocked} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-text">Caption</span>
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} disabled={editingLocked} rows={6} placeholder="What do you want to share?" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <span className="text-[11px] text-text-subtle">{caption.length} characters · master content</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[12px] font-semibold text-text">Hashtags</span>
                  <input value={hashtags} onChange={(event) => setHashtags(event.target.value)} disabled={editingLocked} placeholder="#GetSavDown #MediaTools" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-text">Destination link</span>
                  <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} disabled={editingLocked} placeholder="https://getsavdown.com/blog/…" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <span className="text-[12px] font-semibold text-text block mb-1">Media</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssets.map((asset) => (
                      <span key={asset.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border-light bg-surface">
                        {asset.kind === 'IMAGE' ? (
                          <Image src={asset.url} alt={asset.altText ?? asset.name} fill sizes="64px" className="object-cover" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] text-text-muted">VIDEO</span>
                        )}
                        {!editingLocked && (
                          <button onClick={() => setSelectedMedia((current) => current.filter((id) => id !== asset.id))} className="absolute top-0.5 right-0.5 p-0.5 rounded bg-white/90 text-text-muted hover:text-rose-600" aria-label={`Remove ${asset.name}`}>
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                    <button onClick={() => setMediaOpen(true)} disabled={editingLocked} className="w-16 h-16 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-text-subtle hover:border-primary/50 hover:text-primary" aria-label="Add media">
                      <ImagePlus className="w-4 h-4" />
                      <span className="text-[9px] mt-0.5">Add</span>
                    </button>
                  </div>
                </div>
                <div className="ml-auto">
                  <span className="text-[12px] font-semibold text-text block mb-1">Schedule</span>
                  <div className="flex gap-2">
                    <input type="datetime-local" value={scheduledLocal} onChange={(event) => setScheduledLocal(event.target.value)} disabled={editingLocked} className="rounded-lg border border-border px-2 py-1.5 text-[12px]" aria-label="Schedule date and time" />
                    <select value={timezone} onChange={(event) => setTimezone(event.target.value)} disabled={editingLocked} className="rounded-lg border border-border px-2 py-1.5 text-[12px] bg-white" aria-label="Time zone">
                      {[timezone, 'Asia/Karachi', 'Asia/Dubai', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'UTC'].filter((zone, index, list) => list.indexOf(zone) === index).map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Platforms" subtitle="Each platform gets its own version">
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {bootstrap.platforms.map((platform) => {
                  const selected = platforms.includes(platform.id);
                  const phase = !platform.autoPublish ? 'Manual' : platform.automatedPhase === 3 ? 'Approval' : 'Live API';
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      disabled={editingLocked}
                      aria-pressed={selected}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${selected ? 'border-primary/40 bg-primary/[0.04]' : 'border-border hover:bg-surface'} disabled:opacity-60`}
                    >
                      <PlatformMark platform={platform.id} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-medium text-text truncate">{platform.short}</span>
                        <span className="block text-[9px] text-text-subtle">{phase}</span>
                      </span>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {platforms.length === 0 ? (
                <div className="rounded-lg bg-surface/60 px-4 py-6 text-center text-[12px] text-text-muted">
                  Select at least one platform to tailor its content.
                </div>
              ) : (
                <>
                  <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
                    {platforms.map((platform) => (
                      <button
                        key={platform}
                        onClick={() => setActive(platform)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap ${active === platform ? 'bg-primary/[0.08] text-primary' : 'text-text-muted hover:bg-surface'}`}
                      >
                        <PlatformMark platform={platform} size="xs" />
                        {getPlatform(platform)?.short ?? platform}
                      </button>
                    ))}
                  </div>

                  {activeDef && (
                    <div className="rounded-xl border border-border-light p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <PlatformMark platform={activeDef.id} size="md" />
                        <div>
                          <p className="text-[13px] font-semibold text-text">{activeDef.label}</p>
                          <p className="text-[10px] text-text-muted">{activeDef.accountType} · {activeDef.captionLimit ? `${activeDef.captionLimit.toLocaleString()} char limit` : 'No fixed limit'}</p>
                        </div>
                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-text-muted">
                          {connectedPlatforms.has(activeDef.id) ? 'Account connected' : activeDef.autoPublish ? 'Needs authorization' : 'Manual publishing'}
                        </span>
                      </div>

                      <label className="block">
                        <span className="text-[12px] font-semibold text-text">Caption for {activeDef.short}</span>
                        <textarea
                          value={activeVariant.caption}
                          onChange={(event) => updateVariant({ caption: event.target.value })}
                          disabled={editingLocked}
                          rows={5}
                          placeholder={caption ? 'Leave empty to use the master caption' : ''}
                          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <div className="flex items-center justify-between text-[11px] text-text-subtle">
                          <span>{activeVariant.caption.trim() ? 'Custom caption' : 'Inheriting master caption'}</span>
                          <span className={activeDef.captionLimit && effectiveLength(activeDef.id, activeText, activeLink) > activeDef.captionLimit ? 'text-rose-600 font-semibold' : ''}>
                            {effectiveLength(activeDef.id, activeText, activeLink)}{activeDef.captionLimit ? ` / ${activeDef.captionLimit}` : ''}
                          </span>
                        </div>
                      </label>

                      {(activeDef.titleRequired || activeDef.titleLimit) && (
                        <label className="block mt-3">
                          <span className="text-[12px] font-semibold text-text">Title {activeDef.titleRequired ? '(required)' : '(optional)'}</span>
                          <input value={activeVariant.title} onChange={(event) => updateVariant({ title: event.target.value })} disabled={editingLocked} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </label>
                      )}

                      <details className="mt-3">
                        <summary className="cursor-pointer text-[12px] font-medium text-primary">Platform overrides</summary>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          <label className="block">
                            <span className="text-[11px] font-semibold text-text-muted">Hashtags override</span>
                            <input value={activeVariant.hashtags} onChange={(event) => updateVariant({ hashtags: event.target.value })} disabled={editingLocked} placeholder="Leave empty to inherit" className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-[12px]" />
                          </label>
                          <label className="block">
                            <span className="text-[11px] font-semibold text-text-muted">Link override</span>
                            <input value={activeVariant.linkUrl} onChange={(event) => updateVariant({ linkUrl: event.target.value })} disabled={editingLocked} placeholder="Leave empty to inherit" className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-[12px]" />
                          </label>
                          {activeDef.accountOptions?.includes('board') && (
                            <label className="block">
                              <span className="text-[11px] font-semibold text-text-muted">Pinterest board</span>
                              {pinterestBoards.length > 0 ? (
                                <select value={activeVariant.board} onChange={(event) => updateVariant({ board: event.target.value })} disabled={editingLocked} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-[12px] bg-white">
                                  <option value="">Select a board</option>
                                  {pinterestBoards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
                                </select>
                              ) : (
                                <input value={activeVariant.board} onChange={(event) => updateVariant({ board: event.target.value })} disabled={editingLocked} placeholder="Board name or id" className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-[12px]" />
                              )}
                            </label>
                          )}
                          {activeDef.accountOptions?.includes('visibility') && (
                            <label className="block">
                              <span className="text-[11px] font-semibold text-text-muted">Visibility</span>
                              <select value={activeVariant.visibility} onChange={(event) => updateVariant({ visibility: event.target.value })} disabled={editingLocked} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-[12px] bg-white">
                                <option value="">Default (public)</option>
                                <option value="private">Private</option>
                                <option value="unlisted">Unlisted</option>
                              </select>
                            </label>
                          )}
                        </div>
                      </details>

                      {activeResult && activeResult.issues.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {activeResult.issues.map((issue, index) => (
                            <li key={`${issue.message}-${index}`} className={`flex items-start gap-1.5 text-[11px] ${issue.level === 'error' ? 'text-rose-700' : 'text-amber-700'}`}>
                              {issue.level === 'error' ? <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> : <Info className="w-3 h-3 mt-0.5 shrink-0" />}
                              {issue.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4">
          <SectionCard title="Preview" subtitle={activeDef ? `${activeDef.short} preview` : 'Select a platform'}>
            <div className="p-4">
              {!activeDef ? (
                <p className="text-[12px] text-text-muted">Choose a platform to preview its content.</p>
              ) : (
                <div className="rounded-xl border border-border-light overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border-light bg-surface/50">
                    <PlatformMark platform={activeDef.id} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-text truncate">{activeDef.short}</p>
                      <p className="text-[9px] text-text-subtle truncate">{accounts.find((account) => account.platform === activeDef.id)?.accountName ?? activeDef.accountType}</p>
                    </div>
                  </div>
                  {selectedAssets.length > 0 && (
                    <div className={`grid ${selectedAssets.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-0.5 bg-surface`}>
                      {selectedAssets.slice(0, 4).map((asset) => (
                        <div key={asset.id} className="relative aspect-[4/3]">
                          {asset.kind === 'IMAGE' ? (
                            <Image src={asset.url} alt={asset.altText ?? asset.name} fill sizes="200px" className="object-cover" />
                          ) : (
                            <video src={asset.url} className="w-full h-full object-cover" muted preload="metadata" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-3 py-2.5">
                    <p className="text-[12px] text-text whitespace-pre-wrap break-words">{activeCaption || <span className="text-text-subtle">Caption preview appears here.</span>}</p>
                    {activeHashtags && <p className="text-[11px] text-primary mt-1 break-words">{activeHashtags}</p>}
                    {activeLink && <p className="text-[10px] text-text-muted mt-1 truncate">{activeLink}</p>}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Validation" subtitle={`${platforms.length} platform(s) selected`}>
            <div className="p-4 space-y-2">
              {validation.results.map((entry) => {
                const errors = entry.issues.filter((issue) => issue.level === 'error').length;
                const warnings = entry.issues.length - errors;
                return (
                  <button key={entry.platform} onClick={() => setActive(entry.platform)} className="w-full flex items-center gap-2 text-left">
                    <PlatformMark platform={entry.platform} size="xs" />
                    <span className="text-[11px] text-text-muted flex-1">{getPlatform(entry.platform)?.short}</span>
                    {errors > 0 ? <span className="text-[10px] font-semibold text-rose-600">{errors} error{errors === 1 ? '' : 's'}</span> : warnings > 0 ? <span className="text-[10px] font-semibold text-amber-600">{warnings} note{warnings === 1 ? '' : 's'}</span> : <span className="text-[10px] font-semibold text-emerald-600">Ready</span>}
                  </button>
                );
              })}
              <p className="text-[10px] text-text-subtle pt-1 border-t border-border-light">
                Drafts save regardless. Scheduling and publishing stop on any error-level issue.
              </p>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="p-4 space-y-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => void submit('draft')} loading={submitting === 'draft'} disabled={editingLocked}>
                Save draft
              </Button>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => void submit('schedule')} loading={submitting === 'schedule'} disabled={editingLocked}>
                <CalendarClock className="w-3.5 h-3.5" />
                {canPublish ? 'Schedule post' : 'Propose schedule'}
              </Button>
              {canPublish && (
                <Button size="sm" className="w-full" onClick={() => void submit('publish')} loading={submitting === 'publish'} disabled={editingLocked}>
                  <Send className="w-3.5 h-3.5" /> Publish now
                </Button>
              )}
              <p className="text-[10px] text-text-subtle leading-relaxed">
                Publish now records real attempts. Platforms without a connected account return “Needs authorization”; manual-only platforms return “Manual action required” with copy/export tools.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>

      <Modal open={mediaOpen} onClose={() => setMediaOpen(false)} title="Media library" description="Select up to 20 assets for this post." size="lg">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-[12px] font-medium px-3 py-2 rounded-xl border border-border bg-white hover:bg-surface cursor-pointer">
              <ImagePlus className="w-3.5 h-3.5" /> Upload
              <input type="file" multiple accept={ACCEPTED_UPLOADS} className="hidden" onChange={(event) => void onUpload(event.target.files)} />
            </label>
            <span className="text-[11px] text-text-muted">{uploading > 0 ? `Uploading ${uploading}…` : `${selectedMedia.length} selected`}</span>
            {uploading > 0 && <LoaderCircle className="w-3 h-3 animate-spin text-text-muted" />}
          </div>
          {media.length === 0 ? (
            <p className="text-[12px] text-text-muted py-6 text-center">No media yet. Upload an image or video to attach it.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {media.map((asset) => {
                const selected = selectedMedia.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedMedia((current) => selected ? current.filter((id) => id !== asset.id) : [...current, asset.id].slice(0, 20))}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 ${selected ? 'border-primary' : 'border-transparent'}`}
                    aria-pressed={selected}
                  >
                    {asset.kind === 'IMAGE' ? (
                      <Image src={asset.url} alt={asset.altText ?? asset.name} fill sizes="150px" className="object-cover" />
                    ) : (
                      <video src={asset.url} className="w-full h-full object-cover" muted preload="metadata" />
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate text-left">{formatBytes(asset.sizeBytes)}</span>
                    {selected && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(result)}
        onClose={() => { setResult(null); router.push('/admin/social/posts'); }}
        title="Publishing result"
        description="Each platform reports its own real outcome."
        footer={
          <Button size="sm" onClick={() => { setResult(null); router.push('/admin/social/posts'); }}>
            View posts
          </Button>
        }
      >
        {result && (
          <div className="space-y-2">
            <p className="text-[12px] text-text-muted">Post status: <SocialStatusBadge status={result.status} /></p>
            <ul className="divide-y divide-border-light/60 rounded-lg border border-border-light">
              {result.variants.map((variant) => (
                <li key={variant.id} className="flex items-center gap-2 px-3 py-2">
                  <PlatformMark platform={variant.platform} size="sm" />
                  <span className="text-[12px] text-text flex-1">{getPlatform(variant.platform)?.short ?? variant.platform}</span>
                  <SocialStatusBadge status={variant.status} />
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-text-muted">
              Open the post to copy manual content, confirm a public URL, or retry after connecting an account.
            </p>
            <button onClick={() => { setResult(null); router.push('/admin/social/posts?tab=attention'); }} className="text-[12px] font-medium text-primary hover:underline">
              Go to needs-attention list
            </button>
          </div>
        )}
      </Modal>
    </AdminPage>
  );
}
