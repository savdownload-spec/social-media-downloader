'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, Check, CheckCircle2, DatabaseBackup, Download, FileArchive, HardDrive,
  LoaderCircle, RefreshCw, RotateCcw, ShieldCheck, Trash2, Upload, XCircle,
} from 'lucide-react';
import { AdminPage, EmptyState, PageHeader, SectionCard } from './AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { ALL_BACKUP_CATEGORIES, BACKUP_CATEGORIES, type BackupCategory } from '@/lib/backup/catalog';
import type { BackupHistoryItem } from '@/lib/backup/storage';

type HistoryItem = BackupHistoryItem & { downloadUrl?: string };
type Preview = {
  sha256: string; createdAt: string; createdBy: string; categories: BackupCategory[];
  recordCounts: Record<string, number>; fileCount: number; mediaCount: number;
  compressedBytes: number; uncompressedBytes: number; exclusions: string[];
  conflictPolicy: string; confirmationPhrase: string;
};

const bytes = (value: number) => value < 1024 ? `${value} B` : value < 1024 ** 2 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 ** 2).toFixed(1)} MB`;
const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function AdminBackupClient() {
  const [selected, setSelected] = useState<BackupCategory[]>(ALL_BACKUP_CATEGORIES);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState({ value: 0, message: '' });
  const [completed, setCompleted] = useState<HistoryItem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [restoreReport, setRestoreReport] = useState<{ created: number; skipped: number; errors: number; recovery: HistoryItem } | null>(null);
  const masterRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  const allSelected = selected.length === ALL_BACKUP_CATEGORIES.length;
  const someSelected = selected.length > 0 && !allSelected;
  useEffect(() => { if (masterRef.current) masterRef.current.indeterminate = someSelected; }, [someSelected]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/admin/backups', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'History could not be loaded.');
      setHistory((json.data as HistoryItem[]).map((item) => ({ ...item, downloadUrl: `/api/admin/backups/${item.id}/download` })));
    } catch (cause) { error('Backup history unavailable', cause instanceof Error ? cause.message : undefined); }
    finally { setHistoryLoading(false); }
  }, [error]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const selectedSummary = useMemo(() => BACKUP_CATEGORIES.filter((item) => selected.includes(item.id)).map((item) => item.label).join(', '), [selected]);

  function toggleCategory(id: BackupCategory) {
    setCompleted(null);
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function createBackup() {
    if (!selected.length) return;
    setCreating(true); setCompleted(null); setProgress({ value: 1, message: 'Starting…' });
    try {
      const response = await fetch('/api/admin/backups', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ categories: selected }) });
      if (!response.ok || !response.body) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || 'Backup could not be started.');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      while (true) {
        const chunk = await reader.read();
        pending += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
        const lines = pending.split('\n'); pending = lines.pop() ?? '';
        for (const raw of lines.filter(Boolean)) {
          const event = JSON.parse(raw);
          if (event.phase === 'error') throw new Error(event.message);
          setProgress({ value: event.progress ?? 0, message: event.message ?? '' });
          if (event.backup) setCompleted(event.backup);
        }
        if (chunk.done) break;
      }
      success('Backup created', 'The checksum-verified ZIP is ready to download.');
      await loadHistory();
    } catch (cause) { error('Backup failed', cause instanceof Error ? cause.message : undefined); setProgress({ value: 0, message: '' }); }
    finally { setCreating(false); }
  }

  async function deleteItem(item: HistoryItem) {
    if (!window.confirm(`Delete ${item.fileName}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/admin/backups/${item.id}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error);
      setHistory((current) => current.filter((row) => row.id !== item.id));
      if (completed?.id === item.id) setCompleted(null);
      success('Backup deleted');
    } catch (cause) { error('Delete failed', cause instanceof Error ? cause.message : undefined); }
  }

  function chooseFile(next: File | null) {
    setFile(next); setPreview(null); setConfirmation(''); setRestoreReport(null);
  }

  async function previewRestore() {
    if (!file) return;
    setPreviewing(true); setPreview(null); setRestoreReport(null);
    try {
      const form = new FormData(); form.set('mode', 'preview'); form.set('file', file);
      const response = await fetch('/api/admin/backups/restore', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Preview failed.');
      setPreview(json.data); success('Archive verified', 'Paths, limits, manifest, CRCs, and SHA-256 checksums are valid.');
    } catch (cause) { error('Archive rejected', cause instanceof Error ? cause.message : undefined); }
    finally { setPreviewing(false); }
  }

  async function restore() {
    if (!file || !preview || confirmation !== 'RESTORE') return;
    setRestoring(true); setRestoreReport(null);
    try {
      const form = new FormData();
      form.set('mode', 'restore'); form.set('file', file); form.set('previewSha256', preview.sha256); form.set('confirmation', confirmation);
      const response = await fetch('/api/admin/backups/restore', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Restore failed.');
      setRestoreReport({ ...json.data.report.totals, recovery: json.data.recovery });
      success('Restore completed', `${json.data.report.totals.created} items created; ${json.data.report.totals.skipped} safely skipped.`);
      await loadHistory();
    } catch (cause) { error('Restore stopped', cause instanceof Error ? cause.message : undefined); }
    finally { setRestoring(false); }
  }

  return (
    <AdminPage>
      <PageHeader title="Backup & Restore" description="Create portable, checksum-verified archives and restore without overwriting existing data." />

      <div className="space-y-6">
        <SectionCard title="Create backup" subtitle="Complete website backup or choose only the data you need">
          <div className="p-5 space-y-5">
            <button type="button" onClick={() => setSelected(ALL_BACKUP_CATEGORIES)} className={cn('w-full rounded-xl border p-4 text-left transition-colors flex items-start gap-3', allSelected ? 'border-primary/40 bg-primary/[0.05]' : 'border-border-light hover:border-border')}>
              <span className={cn('mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center', allSelected ? 'bg-primary text-white' : 'bg-surface text-text-muted')}><DatabaseBackup className="h-4.5 w-4.5" /></span>
              <span className="min-w-0"><span className="flex items-center gap-2 text-sm font-semibold text-text">Complete website backup {allSelected && <Check className="h-4 w-4 text-primary" />}</span><span className="mt-1 block text-[12px] text-text-muted">Select every supported database category and all managed uploads. Secrets and authentication credentials are always excluded.</span></span>
            </button>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-[13px] font-medium text-text cursor-pointer">
                <input ref={masterRef} type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : ALL_BACKUP_CATEGORIES)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30" />
                {allSelected ? 'Deselect all' : 'Select all'}
              </label>
              <span className="text-[12px] text-text-muted">{selected.length} of {ALL_BACKUP_CATEGORIES.length} categories selected</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BACKUP_CATEGORIES.map((category) => {
                const checked = selected.includes(category.id);
                return <label key={category.id} className={cn('rounded-xl border p-3.5 cursor-pointer transition-colors flex gap-3', checked ? 'border-primary/30 bg-primary/[0.035]' : 'border-border-light hover:border-border')}>
                  <input type="checkbox" checked={checked} onChange={() => toggleCategory(category.id)} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30" />
                  <span><span className="block text-[13px] font-semibold text-text">{category.label}</span><span className="block text-[11px] leading-5 text-text-muted mt-0.5">{category.description}</span></span>
                </label>;
              })}
            </div>

            <div className="rounded-lg bg-surface/70 px-4 py-3 text-[12px] text-text-muted"><span className="font-semibold text-text">Included:</span> {selectedSummary || 'Nothing selected'}</div>
            {creating && <div aria-live="polite"><div className="flex justify-between text-[12px] text-text-muted mb-1.5"><span>{progress.message}</span><span>{progress.value}%</span></div><div className="h-2 rounded-full bg-surface overflow-hidden"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress.value}%` }} /></div></div>}
            {completed && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2 text-[13px] font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Backup complete · {bytes(completed.size)}</span><a href={`/api/admin/backups/${completed.id}/download`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-emerald-800"><Download className="h-3.5 w-3.5" /> Download ZIP</a></div>}
            <Button onClick={createBackup} disabled={!selected.length} loading={creating} size="sm"><Archive className="h-4 w-4" /> Create Backup</Button>
          </div>
        </SectionCard>

        <SectionCard title="Import & restore" subtitle="Preview and verify an archive before any database change">
          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-dashed border-border p-5 text-center">
              <Upload className="h-6 w-6 text-text-subtle mx-auto mb-2" />
              <label className="cursor-pointer text-[13px] font-semibold text-primary hover:underline">Choose a SavDown ZIP<input type="file" accept=".zip,application/zip" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} /></label>
              <p className="text-[11px] text-text-muted mt-1">Maximum 50 MB compressed / 100 MB expanded</p>
              {file && <p className="mt-3 text-[12px] font-medium text-text"><FileArchive className="h-3.5 w-3.5 inline mr-1.5" />{file.name} · {bytes(file.size)}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={previewRestore} disabled={!file} loading={previewing}><ShieldCheck className="h-4 w-4" /> Validate & Preview</Button>

            {preview && <div className="rounded-xl border border-border-light overflow-hidden">
              <div className="px-4 py-3 bg-surface/60 flex items-center gap-2 text-[13px] font-semibold text-text"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Verified restore preview</div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]"><div><p className="text-text-subtle">Created</p><p className="font-medium text-text mt-0.5">{dateTime(preview.createdAt)}</p></div><div><p className="text-text-subtle">Records</p><p className="font-medium text-text mt-0.5">{Object.values(preview.recordCounts).reduce((a, b) => a + b, 0).toLocaleString()}</p></div><div><p className="text-text-subtle">Media</p><p className="font-medium text-text mt-0.5">{preview.mediaCount.toLocaleString()} files</p></div><div><p className="text-text-subtle">Expanded</p><p className="font-medium text-text mt-0.5">{bytes(preview.uncompressedBytes)}</p></div></div>
                <div className="text-[12px] text-text-muted"><span className="font-semibold text-text">Categories:</span> {preview.categories.map((id) => BACKUP_CATEGORIES.find((item) => item.id === id)?.label ?? id).join(', ')}</div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-900"><strong>Conflict policy:</strong> {preview.conflictPolicy} A recovery point is created and saved before import begins.</div>
                <label className="block"><span className="block text-[12px] font-medium text-text mb-1.5">Type <strong>RESTORE</strong> to confirm</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="h-9 w-full sm:w-72 rounded-lg border border-border-light bg-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" /></label>
                <Button size="sm" onClick={restore} disabled={confirmation !== 'RESTORE'} loading={restoring}><RotateCcw className="h-4 w-4" /> Create Recovery Point & Restore</Button>
              </div>
            </div>}
            {restoreReport && <div className={cn('rounded-xl border px-4 py-3 text-[13px]', restoreReport.errors ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}><div className="font-semibold flex items-center gap-2">{restoreReport.errors ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} Restore finished</div><p className="mt-1 text-[12px]">{restoreReport.created} created, {restoreReport.skipped} safely skipped, {restoreReport.errors} error types reported. <a className="font-semibold underline" href={`/api/admin/backups/${restoreReport.recovery.id}/download`}>Download recovery ZIP</a></p></div>}
          </div>
        </SectionCard>

        <SectionCard title="Backup history" subtitle="Stored archives remain downloadable only through an authenticated Admin endpoint" actions={<button onClick={() => void loadHistory()} className="p-1.5 rounded-lg text-text-muted hover:bg-surface" aria-label="Refresh history"><RefreshCw className={cn('h-4 w-4', historyLoading && 'animate-spin')} /></button>}>
          {historyLoading && !history.length ? <div className="py-12 flex justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-primary" /></div> : !history.length ? <EmptyState icon={HardDrive} title="No backups yet" message="Completed backups and automatic recovery points will appear here." /> : <div className="divide-y divide-border-light">{history.map((item) => <div key={item.id} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><FileArchive className="h-4 w-4 text-primary shrink-0" /><p className="text-[13px] font-semibold text-text truncate">{item.fileName}</p>{item.type === 'recovery' && <span className="rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold">Recovery point</span>}</div><p className="text-[11px] text-text-muted mt-1 ml-6">{dateTime(item.createdAt)} · {bytes(item.size)} · {item.categories.length} categories · {item.fileCount} files</p></div><div className="flex items-center gap-2 ml-6 sm:ml-0"><a href={`/api/admin/backups/${item.id}/download`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-light bg-white px-3 text-[12px] font-medium text-text hover:bg-surface"><Download className="h-3.5 w-3.5" /> Download</a><button onClick={() => void deleteItem(item)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-rose-600 hover:bg-rose-50" aria-label={`Delete ${item.fileName}`}><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div>}
        </SectionCard>
      </div>
    </AdminPage>
  );
}
