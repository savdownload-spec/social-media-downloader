'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import {
  EXPORT_FIELDS, EXPORT_FIELD_CATEGORIES, DEFAULT_EXPORT_FIELD_IDS, DATE_FIELD_OPTIONS,
  EXPORT_FORMATS, formatDateRangeLabel, resolveDateRangePreset,
  type DateRangePreset, type ExportDateField, type ExportFormat,
} from '@/lib/export/fields';
import {
  Download, Users, Filter, CheckSquare, Calendar, ListChecks, FileOutput,
  ClipboardCheck, ChevronRight, ChevronLeft, Loader2, CheckCircle2, AlertCircle,
  History, FileSpreadsheet, FileJson, FileText, FileArchive, FileType, Clock,
} from 'lucide-react';

type Scope = 'all' | 'filtered' | 'selected';
type Step = 'who' | 'date' | 'fields' | 'format' | 'review';
const STEPS: { id: Step; label: string; icon: typeof Users }[] = [
  { id: 'who',    label: 'Who to export', icon: Users },
  { id: 'date',   label: 'Date range',    icon: Calendar },
  { id: 'fields', label: 'Data fields',   icon: ListChecks },
  { id: 'format', label: 'Format',        icon: FileOutput },
  { id: 'review', label: 'Review & Export', icon: ClipboardCheck },
];

const FORMAT_ICONS: Record<ExportFormat, typeof FileText> = {
  csv: FileText, xlsx: FileSpreadsheet, json: FileJson, pdf: FileType, zip: FileArchive,
};

interface CurrentFilters {
  search: string;
  plan: string;
  status?: string;
}

interface UsersExportDrawerProps {
  open: boolean;
  onClose: () => void;
  initialScope: Scope;
  currentFilters: CurrentFilters;
  selectedIds: string[];
  onExported?: () => void;
}

interface ExportJobFile {
  format: ExportFormat; name: string; size: number; downloadUrl: string;
}

interface ExportJobSummary {
  id: string; fileName: string; fileSize: number | null; userCount: number; downloadUrl: string;
  files: ExportJobFile[];
}

interface HistoryJob {
  id: string; fileName: string | null; adminEmail: string; status: string;
  userCount: number; scope: string; dateFrom: string | null; dateTo: string | null;
  formats: string[]; createdAt: string; expiresAt: string; error: string | null; downloadUrl: string | null;
  files: ExportJobFile[];
}

export function UsersExportDrawer({ open, onClose, initialScope, currentFilters, selectedIds, onExported }: UsersExportDrawerProps) {
  const { success, error: toastError } = useToast();
  const [view, setView] = useState<'export' | 'history'>('export');
  const [step, setStep] = useState<Step>('who');

  const hasFilters = !!currentFilters.search || (currentFilters.plan && currentFilters.plan !== 'ALL');
  const [scope, setScope] = useState<Scope>(initialScope);
  const [dateField, setDateField] = useState<ExportDateField>('createdAt');
  const [preset, setPreset] = useState<DateRangePreset>('last30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [fieldIds, setFieldIds] = useState<string[]>(DEFAULT_EXPORT_FIELD_IDS);
  const [formats, setFormats] = useState<ExportFormat[]>(['csv']);
  const [useDateFilter, setUseDateFilter] = useState(false);

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'generating' | 'packaging' | 'done' | 'error'>('idle');
  const [resultJob, setResultJob] = useState<ExportJobSummary | null>(null);
  const [exportErr, setExportErr] = useState('');

  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('who');
    setView('export');
    setScope(initialScope);
    setPhase('idle');
    setResultJob(null);
    setExportErr('');
  }, [open, initialScope]);

  const { from, to } = useMemo(
    () => (useDateFilter ? resolveDateRangePreset(preset, customFrom, customTo) : { from: null, to: null }),
    [useDateFilter, preset, customFrom, customTo],
  );
  const dateRangeLabel = useMemo(() => (useDateFilter ? formatDateRangeLabel(preset, from, to) : 'All time'), [useDateFilter, preset, from, to]);

  // Guards against a slower, now-stale preview request (e.g. issued for the
  // previous scope right before the reset effect switches scope again)
  // resolving after a newer one and clobbering the correct count.
  const previewRequestId = useRef(0);

  const loadPreview = useCallback(() => {
    const requestId = ++previewRequestId.current;
    if (scope === 'selected') { setPreviewCount(selectedIds.length); return; }
    setPreviewLoading(true);
    const p = new URLSearchParams({ scope, dateField });
    if (useDateFilter) {
      p.set('datePreset', preset);
      if (preset === 'custom') { if (customFrom) p.set('customFrom', customFrom); if (customTo) p.set('customTo', customTo); }
    }
    if (scope === 'filtered') {
      if (currentFilters.search) p.set('search', currentFilters.search);
      if (currentFilters.plan && currentFilters.plan !== 'ALL') p.set('plan', currentFilters.plan);
      if (currentFilters.status) p.set('status', currentFilters.status);
    }
    fetch(`/api/admin/users/export/preview?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok && requestId === previewRequestId.current) setPreviewCount(d.data.count); })
      .finally(() => { if (requestId === previewRequestId.current) setPreviewLoading(false); });
  }, [scope, dateField, useDateFilter, preset, customFrom, customTo, currentFilters, selectedIds.length]);

  useEffect(() => { if (open) loadPreview(); }, [open, loadPreview]);

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    fetch('/api/admin/users/export?pageSize=15')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setHistory(d.data.jobs); })
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => { if (open && view === 'history') loadHistory(); }, [open, view, loadHistory]);

  function toggleField(id: string) {
    setFieldIds((cur) => (cur.includes(id) ? cur.filter((f) => f !== id) : [...cur, id]));
  }
  function toggleFormat(id: ExportFormat) {
    setFormats((cur) => {
      const next = cur.includes(id) ? cur.filter((f) => f !== id) : [...cur, id];
      if (next.includes('zip') && next.filter((f) => f !== 'zip').length === 0) {
        return ['csv', 'xlsx', 'json', 'pdf', 'zip'];
      }
      return next;
    });
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const canNext = step !== 'fields' || fieldIds.length > 0;
  const canExport = fieldIds.length > 0 && formats.length > 0;

  async function runExport() {
    setExporting(true);
    setPhase('preparing');
    setProgressMessage('Starting export...');
    setExportErr('');
    setResultJob(null);
    try {
      const res = await fetch('/api/admin/users/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope,
          filter: scope === 'filtered' ? currentFilters : undefined,
          selectedIds: scope === 'selected' ? selectedIds : undefined,
          dateField,
          datePreset: useDateFilter ? preset : undefined,
          customFrom: useDateFilter && preset === 'custom' ? customFrom : undefined,
          customTo: useDateFilter && preset === 'custom' ? customTo : undefined,
          fields: fieldIds,
          formats,
        }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? 'Export failed to start');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.phase === 'error') { setPhase('error'); setExportErr(evt.message); }
          else if (evt.phase === 'done') { setPhase('done'); setResultJob(evt.job); onExported?.(); }
          else { setPhase(evt.phase); setProgressMessage(evt.message); }
        }
      }
    } catch (e) {
      setPhase('error');
      setExportErr(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  const fieldsByCategory = EXPORT_FIELD_CATEGORIES.map((cat) => ({
    cat, fields: EXPORT_FIELDS.filter((f) => f.category === cat.id),
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={view === 'history' ? 'Export history' : 'Export Users'}
      description={view === 'history' ? 'Recent exports, expiring automatically after 24 hours.' : undefined}
      footer={view === 'export' && phase === 'idle' ? (
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)].id)}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:text-text hover:bg-surface transition-colors disabled:opacity-0"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step === 'review' ? (
            <button
              type="button"
              onClick={runExport}
              disabled={!canExport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover shadow-soft transition-all disabled:opacity-40"
            >
              <Download className="w-4 h-4" /> Export {previewCount != null ? previewCount.toLocaleString() : ''} users
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)].id)}
              disabled={!canNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-text text-white hover:bg-text/90 shadow-soft transition-all disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : undefined}
    >
      {/* Header tabs: New export / History */}
      <div className="flex items-center gap-1.5 mb-5 -mt-1">
        <button
          type="button"
          onClick={() => setView('export')}
          className={cn('px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all', view === 'export' ? 'bg-text text-white' : 'bg-white border border-border-light text-text-muted hover:text-text')}
        >
          New export
        </button>
        <button
          type="button"
          onClick={() => setView('history')}
          className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all', view === 'history' ? 'bg-text text-white' : 'bg-white border border-border-light text-text-muted hover:text-text')}
        >
          <History className="w-3 h-3" /> History
        </button>
      </div>

      {view === 'history' ? (
        <HistoryView jobs={history} loading={historyLoading} />
      ) : phase !== 'idle' ? (
        <ExportProgress phase={phase} message={progressMessage} error={exportErr} job={resultJob} onRetry={() => setPhase('idle')} />
      ) : (
        <div>
          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => i <= stepIndex && setStep(s.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0',
                  s.id === step ? 'bg-primary/[0.08] text-primary' : i < stepIndex ? 'text-emerald-600 hover:bg-surface' : 'text-text-subtle',
                )}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-text-subtle ml-0.5" />}
              </button>
            ))}
          </div>

          {step === 'who' && (
            <div className="space-y-2.5">
              <ScopeCard
                active={scope === 'all'} onClick={() => setScope('all')}
                icon={Users} title="All users" description="Every registered user in SavDown."
              />
              <ScopeCard
                active={scope === 'filtered'} onClick={() => setScope('filtered')}
                icon={Filter} title="Filtered users" description={hasFilters ? 'Users matching the current search and plan filter.' : 'No filters are currently active on the Users table.'}
                disabled={!hasFilters}
              />
              <ScopeCard
                active={scope === 'selected'} onClick={() => setScope('selected')}
                icon={CheckSquare} title="Selected users" description={selectedIds.length > 0 ? `${selectedIds.length.toLocaleString()} users selected in the table.` : 'Select rows in the Users table first.'}
                disabled={selectedIds.length === 0}
              />
              <div className="mt-3 px-3.5 py-2.5 rounded-lg bg-primary/[0.05] border border-primary/10 text-[12px] text-text-muted flex items-center gap-2">
                {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Users className="w-3.5 h-3.5 text-primary" />}
                <span className="font-semibold text-text">{previewCount != null ? previewCount.toLocaleString() : '—'}</span> users will be exported
              </div>
            </div>
          )}

          {step === 'date' && (
            <div>
              {scope === 'selected' ? (
                <p className="text-[13px] text-text-muted bg-surface/60 border border-border-light rounded-lg p-4">
                  Date range doesn&apos;t apply to a hand-picked selection — all {selectedIds.length.toLocaleString()} selected users will be included regardless of date.
                </p>
              ) : (
                <>
                  <Checkbox checked={useDateFilter} onChange={setUseDateFilter} label="Filter by date range" description="Leave off to include users from all time." className="mb-4" />
                  {useDateFilter && (
                    <>
                      <div className="mb-4">
                        <p className="text-[12px] font-medium text-text-muted mb-1.5">Filter users by</p>
                        <div className="flex gap-2">
                          {DATE_FIELD_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setDateField(opt.id)}
                              className={cn('px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all', dateField === opt.id ? 'bg-text text-white border-text' : 'bg-white border-border-light text-text-muted hover:text-text')}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <DateRangePicker
                        preset={preset} onPresetChange={setPreset}
                        customFrom={customFrom} customTo={customTo}
                        onCustomFromChange={setCustomFrom} onCustomToChange={setCustomTo}
                      />
                      <p className="mt-3 text-[12px] text-text-muted">
                        Range: <span className="font-medium text-text">{dateRangeLabel}</span>
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {step === 'fields' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] text-text-muted">{fieldIds.length} of {EXPORT_FIELDS.length} fields selected</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFieldIds(EXPORT_FIELDS.map((f) => f.id))} className="text-[11px] font-semibold text-primary hover:underline">Select all</button>
                  <button type="button" onClick={() => setFieldIds([])} className="text-[11px] font-semibold text-text-muted hover:underline">Clear all</button>
                </div>
              </div>
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {fieldsByCategory.map(({ cat, fields }) => (
                  <div key={cat.id}>
                    <p className="text-[10px] font-semibold text-text-subtle uppercase tracking-wider mb-1.5">{cat.label}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-lg border border-border-light bg-white">
                      {fields.map((f) => (
                        <Checkbox key={f.id} checked={fieldIds.includes(f.id)} onChange={() => toggleField(f.id)} label={f.label} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'format' && (
            <div className="space-y-2.5">
              {EXPORT_FORMATS.map((f) => {
                const Icon = FORMAT_ICONS[f.id];
                const active = formats.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFormat(f.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                      active ? 'border-primary bg-primary/[0.05]' : 'border-border-light bg-white hover:border-border',
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', active ? 'bg-primary text-white' : 'bg-surface text-text-muted')}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-text">{f.label}</p>
                      <p className="text-[11px] text-text-muted">{f.blurb}</p>
                    </div>
                    <Checkbox checked={active} onChange={() => toggleFormat(f.id)} />
                  </button>
                );
              })}
              {formats.includes('zip') && (
                <p className="text-[11px] text-text-muted px-1">ZIP bundles every other selected format into one download.</p>
              )}
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border-light overflow-hidden">
                <ReviewRow label="Users" value={previewCount != null ? previewCount.toLocaleString() : '—'} />
                <ReviewRow label="Date range" value={scope === 'selected' ? 'Not applied (manual selection)' : dateRangeLabel} />
                <ReviewRow label="Formats" value={<div className="flex flex-wrap gap-1.5 justify-end">{formats.map((f) => <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold">{f.toUpperCase()} <CheckCircle2 className="w-3 h-3" /></span>)}</div>} />
                <ReviewRow label="Fields" value={`${fieldIds.length} selected`} last />
              </div>
              <div className="flex justify-end gap-2 -mt-2">
                <button type="button" onClick={() => setFieldIds(EXPORT_FIELDS.map((f) => f.id))} className="text-[11px] font-semibold text-primary hover:underline">Select all fields</button>
                <button type="button" onClick={() => setFieldIds([])} className="text-[11px] font-semibold text-text-muted hover:underline">Clear all fields</button>
              </div>
              <p className="text-[12px] text-text-muted bg-surface/60 border border-border-light rounded-lg p-3">
                This export is logged in the Admin Audit Log and expires automatically 24 hours after generation.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function ScopeCard({ active, onClick, icon: Icon, title, description, disabled }: {
  active: boolean; onClick: () => void; icon: typeof Users; title: string; description: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
        disabled ? 'border-border-light bg-surface/40 opacity-50 cursor-not-allowed' :
        active ? 'border-primary bg-primary/[0.05]' : 'border-border-light bg-white hover:border-border',
      )}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', active ? 'bg-primary text-white' : 'bg-surface text-text-muted')}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-text">{title}</p>
        <p className="text-[11px] text-text-muted">{description}</p>
      </div>
    </button>
  );
}

function ReviewRow({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between px-4 py-3 bg-white', !last && 'border-b border-border-light')}>
      <span className="text-[12px] font-medium text-text-muted">{label}</span>
      <span className="text-[13px] font-semibold text-text">{value}</span>
    </div>
  );
}

function ExportProgress({ phase, message, error, job, onRetry }: {
  phase: 'preparing' | 'generating' | 'packaging' | 'done' | 'error';
  message: string; error: string; job: ExportJobSummary | null;
  onRetry: () => void;
}) {
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
          <AlertCircle className="w-5 h-5 text-rose-500" />
        </div>
        <p className="text-sm font-semibold text-text mb-1">Export failed</p>
        <p className="text-[13px] text-text-muted max-w-sm mb-4">{error}</p>
        <button onClick={onRetry} className="px-4 py-2 rounded-lg text-[13px] font-medium text-primary bg-primary/[0.08] hover:bg-primary/[0.12] transition-colors">Try again</button>
      </div>
    );
  }
  if (phase === 'done' && job) {
    const files = job.files.length > 0 ? job.files : [{ format: 'csv' as ExportFormat, name: job.fileName, size: job.fileSize ?? 0, downloadUrl: job.downloadUrl }];
    return (
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-text mb-1">Ready to download</p>
        <p className="text-[13px] text-text-muted mb-4">{job.userCount.toLocaleString()} users</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {files.map((f) => (
            <a
              key={f.name}
              href={f.downloadUrl}
              download
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover shadow-soft transition-all"
            >
              <Download className="w-4 h-4" /> Download {f.name}
            </a>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center text-center py-10">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-sm font-semibold text-text mb-1 capitalize">{phase}...</p>
      <p className="text-[13px] text-text-muted">{message}</p>
    </div>
  );
}

function HistoryView({ jobs, loading }: { jobs: HistoryJob[]; loading: boolean }) {
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <History className="w-8 h-8 text-text-subtle mb-2" />
        <p className="text-[13px] text-text-muted">No exports yet.</p>
      </div>
    );
  }
  const statusStyle: Record<string, string> = {
    PROCESSING: 'bg-blue-50 text-blue-700',
    COMPLETED: 'bg-emerald-50 text-emerald-700',
    FAILED: 'bg-rose-50 text-rose-700',
    EXPIRED: 'bg-surface text-text-muted',
  };
  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
      {jobs.map((j) => (
        <div key={j.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border-light bg-white">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text truncate">{j.fileName ?? 'Export'}</p>
            <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{j.adminEmail}</span>·<span>{new Date(j.createdAt).toLocaleString()}</span>·<span>{j.userCount.toLocaleString()} users</span>
              {j.status === 'COMPLETED' && (
                <span className="inline-flex items-center gap-1 text-text-subtle"><Clock className="w-3 h-3" /> expires {new Date(j.expiresAt).toLocaleDateString()}</span>
              )}
            </p>
            {j.error && <p className="text-[11px] text-rose-600 mt-0.5">{j.error}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold', statusStyle[j.status] ?? 'bg-surface text-text-muted')}>{j.status}</span>
            {j.files.length > 0 ? (
              j.files.map((f) => (
                <a key={f.name} href={f.downloadUrl} download className="p-1.5 rounded-lg hover:bg-primary/[0.08] text-text-muted hover:text-primary transition-colors" title={`Download ${f.name}`}>
                  <Download className="w-3.5 h-3.5" />
                </a>
              ))
            ) : j.downloadUrl && (
              <a href={j.downloadUrl} download className="p-1.5 rounded-lg hover:bg-primary/[0.08] text-text-muted hover:text-primary transition-colors" title="Download">
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
