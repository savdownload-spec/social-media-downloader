'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Pencil, Search, Trash2, Upload } from 'lucide-react';
import { AdminPage, EmptyState, ErrorState, PageHeader, SectionCard, Skeleton } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { apiGet, apiSend } from './api';
import { ACCEPTED_UPLOADS, uploadSocialFile } from './upload';
import type { MediaAsset } from './types';
import { formatBytes } from '@/lib/social/media';

const TABS = [
  { id: '', label: 'All' },
  { id: 'IMAGE', label: 'Images' },
  { id: 'VIDEO', label: 'Videos' },
];

export function SocialMediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [editName, setEditName] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '24' });
      if (kind) query.set('kind', kind);
      if (search.trim()) query.set('search', search.trim());
      const data = await apiGet<{ assets: MediaAsset[]; total: number }>(`/api/admin/social/media?${query.toString()}`);
      setAssets(data.assets);
      setTotal(data.total);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The media library could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [kind, page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploading(list.length);
    let uploaded = 0;
    for (const file of list) {
      try {
        await uploadSocialFile(file);
        uploaded += 1;
      } catch (cause) {
        toastError(`Could not upload ${file.name}`, cause instanceof Error ? cause.message : undefined);
      } finally {
        setUploading((count) => count - 1);
      }
    }
    if (uploaded > 0) {
      success(`${uploaded} asset${uploaded === 1 ? '' : 's'} uploaded`);
      await load();
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function openEdit(asset: MediaAsset) {
    setEditing(asset);
    setEditName(asset.name);
    setEditAlt(asset.altText ?? '');
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    try {
      await apiSend(`/api/admin/social/media/${editing.id}`, 'PATCH', {
        name: editName.trim() || editing.name,
        altText: editAlt.trim() || null,
      });
      success('Asset updated');
      setEditing(null);
      await load();
    } catch (cause) {
      toastError('Update failed', cause instanceof Error ? cause.message : undefined);
    } finally {
      setSavingEdit(false);
    }
  }

  async function remove(asset: MediaAsset) {
    const approved = await confirm({
      title: 'Delete this asset?',
      description: 'The file and its record are removed. Assets used by a post cannot be deleted.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!approved) return;
    try {
      await apiSend(`/api/admin/social/media/${asset.id}`, 'DELETE');
      success('Asset deleted');
      await load();
    } catch (cause) {
      toastError('Delete failed', cause instanceof Error ? cause.message : undefined);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 24));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Social Media"
        title="Media Library"
        description="Upload once, reuse across posts. Images and video are stored in your own Blob store."
        actions={
          <Button onClick={() => fileRef.current?.click()} loading={uploading > 0}>
            {uploading === 0 && <Upload className="w-4 h-4" />}
            {uploading > 0 ? `Uploading ${uploading}…` : 'Upload media'}
          </Button>
        }
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPTED_UPLOADS}
        className="hidden"
        // lgtm[js/xss-through-dom]
        // Safe: file.name is rendered through React JSX which auto-escapes text content
        onChange={(event) => void onFiles(event.target.files)}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="flex gap-1 rounded-xl bg-surface p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setKind(tab.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                kind === tab.id ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle" />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search name or alt text"
            className="w-full rounded-lg border border-border pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <span className="text-[11px] text-text-muted sm:ml-auto">{total} asset{total === 1 ? '' : 's'}</span>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading && assets.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-square" />)}
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-white border border-border-light rounded-xl">
          <EmptyState
            icon={ImagePlus}
            title="No media yet"
            message="Upload JPEG, PNG, WebP, GIF, MP4, MOV, or WebM files. Instagram requires JPEG images."
            action={<Button size="sm" onClick={() => fileRef.current?.click()}>Upload media</Button>}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {assets.map((asset) => (
              <SectionCard key={asset.id} className="overflow-hidden group">
                <div className="relative aspect-square bg-surface">
                  {asset.kind === 'IMAGE' ? (
                    <Image
                      src={asset.url}
                      alt={asset.altText ?? asset.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <video src={asset.url} className="w-full h-full object-cover" preload="metadata" controls />
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(asset)}
                      className="p-1.5 rounded-lg bg-white/95 text-text-muted hover:text-primary shadow-sm"
                      aria-label={`Edit ${asset.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => void remove(asset)}
                      className="p-1.5 rounded-lg bg-white/95 text-text-muted hover:text-rose-600 shadow-sm"
                      aria-label={`Delete ${asset.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[12px] font-medium text-text truncate" title={asset.name}>{asset.name}</p>
                  <p className="text-[10px] text-text-muted">
                    {asset.kind === 'IMAGE' ? 'Image' : 'Video'} · {formatBytes(asset.sizeBytes)}
                    {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                  </p>
                  <p className="text-[10px] text-text-subtle">
                    {asset.usageCount ? `Used in ${asset.usageCount} post${asset.usageCount === 1 ? '' : 's'}` : 'Unused'}
                  </p>
                </div>
              </SectionCard>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-[12px] text-text-muted">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-surface">Previous</button>
                <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-surface">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {uploading > 0 && (
        <p className="mt-3 text-[11px] text-text-muted inline-flex items-center gap-1.5">
          <LoaderCircle className="w-3 h-3 animate-spin" /> Uploading {uploading} file{uploading === 1 ? '' : 's'} directly to storage…
        </p>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit asset"
        description="Alt text is used where a platform supports it."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            <Button size="sm" onClick={() => void saveEdit()} loading={savingEdit}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-text">Name</span>
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-text">Alt text</span>
            <textarea
              value={editAlt}
              onChange={(event) => setEditAlt(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
      </Modal>
    </AdminPage>
  );
}
