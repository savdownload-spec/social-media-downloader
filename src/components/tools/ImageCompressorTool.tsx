'use client';
/**
 * ImageCompressorTool — premium batch image compression UI.
 *
 * Architecture: Frontend → POST /api/tools/image/compress-batch → imageService.ts → Sharp
 *
 * Phases:
 *   1. Upload  — drag-and-drop / file picker, quality slider, batch limit UI
 *   2. Processing — per-file progress list
 *   3. Results — summary stats, per-file cards, individual downloads, ZIP
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import {
  Upload,
  Download,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Archive,
  RefreshCw,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProcessingProgress } from '@/components/tools/ProcessingProgress';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { FunctionalToolProps } from '@/config/functionalTools';
import { useSignInGuard } from '@/hooks/useSignInGuard';
import { useBatchLimit } from '@/hooks/useBatchLimit';
import { BatchLimitHint, BatchLimitWarning } from '@/components/tools/BatchLimitGate';
import { PLAN_LABEL } from '@/lib/batchLimits';
import { IMAGE_ACCEPT, IMAGE_MAX_FILE_BYTES, isAllowedImageType } from '@/lib/imageConfig';
import { decodeImageBatchPayload } from '@/lib/imageBatchPayload';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompressResult {
  sourceName: string;
  name: string;
  status: 'completed' | 'failed';
  originalSize?: number;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  offset?: number;
  length?: number;
  url?: string; // object URL created from the binary batch payload
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

function deduplicateName(name: string, seen: Map<string, number>): string {
  if (!seen.has(name)) {
    seen.set(name, 1);
    return name;
  }
  const extMatch = name.match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0] : '';
  const base = name.slice(0, name.length - ext.length);
  const count = (seen.get(name) ?? 1) + 1;
  seen.set(name, count);
  return `${base}_${count}${ext}`;
}

function useAnimatedValue(target: number, duration = 850): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const fraction = Math.min(1, (now - started) / duration);
      setValue(target * (1 - Math.pow(1 - fraction, 3)));
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function CompressionSummaryStats({ original, compressed, saved, reduction }: { original: number; compressed: number; saved: number; reduction: number }) {
  const animatedOriginal = useAnimatedValue(original);
  const animatedCompressed = useAnimatedValue(compressed);
  const animatedSaved = useAnimatedValue(saved);
  const animatedReduction = useAnimatedValue(reduction);
  return <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
    <div><p className="text-xs text-text-muted">Original</p><p className="font-semibold tabular-nums text-text">{formatBytes(animatedOriginal)}</p></div>
    <div><p className="text-xs text-text-muted">Compressed</p><p className="font-semibold tabular-nums text-text">{formatBytes(animatedCompressed)}</p></div>
    <div><p className="text-xs text-text-muted">Saved</p><p className="font-semibold tabular-nums text-primary">{formatBytes(Math.max(0, animatedSaved))}</p></div>
    <div><p className="text-xs text-text-muted">Reduction</p><p className={cn('font-semibold tabular-nums', reduction > 0 ? 'text-primary' : 'text-amber-600')}>{animatedReduction.toFixed(1)}%</p></div>
  </div>;
}

function CompressionSummaryTitle({ succeeded, total }: { succeeded: number; total: number }) {
  const animated = useAnimatedValue(succeeded);
  return <h2 className="font-semibold text-text">Compression complete — <span className="tabular-nums">{Math.round(animated)}/{total}</span> succeeded</h2>;
}

// ---------------------------------------------------------------------------
// Savings ring — SVG circle showing overall compression %
// ---------------------------------------------------------------------------

function SavingsRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, useAnimatedValue(pct)));
  const isPositive = pct > 0;
  return (
    <div className="relative flex h-24 w-24 items-center justify-center" aria-label={`${clamped.toFixed(1)}% space saved`}>
      <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90" aria-hidden>
        {/* Track */}
        <circle
          cx="18" cy="18" r="15.915"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-border"
        />
        {/* Progress */}
        <circle
          cx="18" cy="18" r="15.915"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={`${clamped} ${100 - clamped}`}
          strokeLinecap="round"
          className={isPositive ? 'text-primary' : 'text-amber-500'}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className={cn('text-lg font-bold tabular-nums', isPositive ? 'text-primary' : 'text-amber-500')}>
          {clamped.toFixed(0)}%
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">saved</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Continue-with links
// ---------------------------------------------------------------------------

const CONTINUE_LINKS = [
  { href: '/tools/image-resizer',      label: 'Image Resizer' },
  { href: '/tools/image-converter',    label: 'Image Converter' },
  { href: '/tools/image-enhancer',     label: 'Image Enhancer' },
  { href: '/tools/background-remover', label: 'Background Remover' },
  { href: '/tools/image-upscaler',     label: 'Image Upscaler' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ImageCompressorTool({ slug }: FunctionalToolProps) {
  const { error: errToast } = useToast();
  const { requireAuth, SignInModal } = useSignInGuard();
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const requestKeyRef = useRef<string | null>(null);

  // Upload phase state
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(80);
  const [error, setError] = useState('');

  // Processing phase state
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingPercent, setProcessingPercent] = useState<number | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Results phase state
  const [results, setResults] = useState<CompressResult[] | null>(null);
  const [failedInputs, setFailedInputs] = useState<File[]>([]);

  // Per-card expand state
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  // ZIP generation state
  const [zipping, setZipping] = useState(false);

  // Batch limit hook
  const {
    plan, limit: batchLimit, allLimits, canUpgrade, loading: limitLoading,
    authenticated, totalCredits, imageToolCreditCost,
  } = useBatchLimit(slug);
  // While plan is loading, suppress limit-dependent UI to avoid briefly showing
  // wrong limits (e.g. FREE fallback for a PRO user).
  const planReady = !limitLoading;

  // Hard system maximum — absolute ceiling regardless of credits or plan.
  // Derived from the highest tier in the limits object (max === lifetime === 50).
  const hardBatchLimit = Math.max(allLimits.free, allLimits.pro, allLimits.max, allLimits.lifetime);

  // How many files can actually be sent to the server (cannot exceed hardBatchLimit).
  const processableCount = Math.min(files.length, hardBatchLimit);

  // Files beyond the hard maximum: must be removed. Credits cannot bypass this.
  const filesOverHardMax = files.slice(hardBatchLimit);
  const isOverHardMax = files.length > hardBatchLimit;

  // Files between the plan limit and hardBatchLimit require enough credits to
  // opt into the larger batch, but every successful output uses the configured
  // per-image credit cost.
  const isOverPlanLimit = processableCount > batchLimit;

  // Exact maximum cost for this submission. Failed files are not charged.
  const confirmedCost =
    imageToolCreditCost && processableCount > 0
      ? processableCount * imageToolCreditCost
      : 0;

  const canAffordBatch = authenticated && imageToolCreditCost !== null && totalCredits !== null && totalCredits >= confirmedCost;
  const affordableCount = authenticated && imageToolCreditCost && totalCredits !== null
    ? Math.floor(totalCredits / imageToolCreditCost)
    : batchLimit;

  // The button never submits more files than the server can authorize.
  const processingLimit = Math.min(processableCount, affordableCount);

  // Unified "over limit" flag: any case where files cannot all be processed.
  const isOverLimit = files.length > processingLimit;

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      results?.forEach((r) => {
        if (r.url) URL.revokeObjectURL(r.url);
      });
    };
  }, [results]);

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming) return;
      const arr = Array.from(incoming);
      if (!arr.length) return;
      setError('');
      const images = arr.filter((f) => isAllowedImageType(f.type) && f.size > 0 && f.size <= IMAGE_MAX_FILE_BYTES);
      if (images.length < arr.length) {
        setError(`${arr.length - images.length} unsupported, empty, or oversized file(s) were ignored.`);
      }
      setFiles((prev) => [...prev, ...images]);
      requestKeyRef.current = null;
    },
    [],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    requestKeyRef.current = null;
  }, []);

  const removeExcess = useCallback(() => {
    setFiles((prev) => prev.slice(0, processingLimit));
    requestKeyRef.current = null;
  }, [processingLimit]);

  // ---------------------------------------------------------------------------
  // Compress action
  // ---------------------------------------------------------------------------

  const compress = useCallback(async () => {
    if (!requireAuth()) return;
    if (processingRef.current) return;
    if (!files.length) { setError('Add at least one image first.'); return; }

    const filesToProcess = files.slice(0, processingLimit);
    const idempotencyKey = requestKeyRef.current ?? crypto.randomUUID();
    requestKeyRef.current = idempotencyKey;

    processingRef.current = true;
    setLoading(true);
    setUploading(true);
    setProcessingPercent(null);
    setError('');
    setResults(null);
    setTotalCount(filesToProcess.length);
    setProcessedCount(0);

    try {
      const formData = new FormData();
      filesToProcess.forEach((f) => formData.append('file', f));
      formData.append('quality', String(quality));

      const res = await fetch('/api/tools/image/compress-batch', {
        method: 'POST',
        headers: { 'Idempotency-Key': `image:${idempotencyKey}`, 'X-Progress-Stream': '1' },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        const retryAfter = res.headers.get('Retry-After');
        throw new Error(data.error ?? (res.status === 429 && retryAfter ? `Too many requests. Try again in ${retryAfter} seconds.` : `Request failed (${res.status}).`));
      }

      setUploading(false);
      if (!res.body) throw new Error('The image processor did not provide a progress stream.');
      const reader = res.body.getReader();
      let chunk = new Uint8Array(0);
      let cursor = 0;
      const readBytes = async (length: number): Promise<Uint8Array> => {
        const bytes = new Uint8Array(length);
        let copied = 0;
        while (copied < length) {
          if (cursor >= chunk.length) {
            const next = await reader.read();
            if (next.done) throw new Error('The progress stream ended before the result was complete.');
            chunk = next.value;
            cursor = 0;
          }
          const take = Math.min(length - copied, chunk.length - cursor);
          bytes.set(chunk.subarray(cursor, cursor + take), copied);
          cursor += take;
          copied += take;
        }
        return bytes;
      };
      let payload: ArrayBuffer | null = null;
      while (payload === null) {
        const header = await readBytes(5);
        const length = new DataView(header.buffer).getUint32(1, false);
        if (length > 200 * 1024 * 1024) throw new Error('The image processor returned an oversized result.');
        const body = await readBytes(length);
        if (header[0] === 1) {
          const update = JSON.parse(new TextDecoder().decode(body)) as { processed: number; total: number; completed: number };
          if (update.total > 0) setProcessingPercent(Math.min(99, Math.round(update.processed / update.total * 100)));
          setProcessedCount(update.completed);
        } else if (header[0] === 2) {
          payload = body.buffer as ArrayBuffer;
        } else if (header[0] === 3) {
          const failure = JSON.parse(new TextDecoder().decode(body)) as { error?: string };
          throw new Error(failure.error || 'Compression failed.');
        } else {
          throw new Error('The image processor returned an unknown progress frame.');
        }
      }
      const { manifest: data, dataStart } = decodeImageBatchPayload<CompressResult>(payload);

      setProcessedCount(data.completed ?? 0);

      const built: CompressResult[] = (data.files ?? []).map((item) => {
        if (item.status === 'completed' && item.mimeType && item.offset !== undefined && item.length !== undefined) {
          const start = dataStart + item.offset;
          const end = start + item.length;
          if (start < dataStart || end > payload.byteLength) return { ...item, status: 'failed', error: 'The returned file data was incomplete.' };
          const blob = new Blob([payload.slice(start, end)], { type: item.mimeType });
          return { ...item, url: URL.createObjectURL(blob), offset: undefined, length: undefined };
        }
        return item;
      });

      if (data.completed > 0) {
        setProcessingPercent(100);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      setResults(built);
      requestKeyRef.current = null;

      // Track which original files failed so user can retry
      const failedNames = new Set(
        built.filter((r) => r.status === 'failed').map((r) => r.sourceName),
      );
      setFailedInputs(filesToProcess.filter((f) => {
        const safeName = f.name.replace(/[/\\?%*:|"<>]/g, '-');
        return failedNames.has(safeName);
      }));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not compress images.';
      setError(message);
      errToast('Compression failed', message);
    } finally {
      processingRef.current = false;
      setLoading(false);
      setUploading(false);
      setProcessingPercent(null);
    }
  }, [requireAuth, files, processingLimit, quality, errToast]);

  // ---------------------------------------------------------------------------
  // Retry failed files
  // ---------------------------------------------------------------------------

  const retryFailed = useCallback(() => {
    if (!failedInputs.length) return;
    // Revoke existing result URLs before clearing
    results?.forEach((r) => { if (r.url) URL.revokeObjectURL(r.url); });
    setFiles(failedInputs);
    setResults(null);
    setFailedInputs([]);
    setExpandedCards(new Set());
    setError('');
  }, [failedInputs, results]);

  // ---------------------------------------------------------------------------
  // Compress more images
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    results?.forEach((r) => { if (r.url) URL.revokeObjectURL(r.url); });
    setFiles([]);
    setResults(null);
    setFailedInputs([]);
    setExpandedCards(new Set());
    setError('');
    setProcessedCount(0);
    setTotalCount(0);
    requestKeyRef.current = null;
    if (inputRef.current) inputRef.current.value = '';
  }, [results]);

  // ---------------------------------------------------------------------------
  // Download All as ZIP
  // ---------------------------------------------------------------------------

  const downloadZip = useCallback(async () => {
    if (!results) return;
    const successful = results.filter((r) => r.status === 'completed' && r.url);
    if (!successful.length) return;
    if (zipping) return;

    setZipping(true);
    try {
      const zip = new JSZip();
      const seen = new Map<string, number>();
      for (const result of successful) {
        const dedupedName = deduplicateName(result.name, seen);
        const blob = await fetch(result.url!).then((r) => r.blob());
        zip.file(dedupedName, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'savdown-compressed-images.zip';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'ZIP generation failed.';
      errToast('ZIP failed', `${message} Individual downloads are still available.`);
    } finally {
      setZipping(false);
    }
  }, [results, zipping, errToast]);

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------

  const successfulResults = results?.filter((r) => r.status === 'completed') ?? [];
  const failedResults = results?.filter((r) => r.status === 'failed') ?? [];

  const totalOriginal = successfulResults.reduce((s, r) => s + (r.originalSize ?? 0), 0);
  const totalCompressed = successfulResults.reduce((s, r) => s + (r.size ?? 0), 0);
  const totalSaved = totalOriginal - totalCompressed;
  const overallPct = totalOriginal > 0 ? (totalSaved / totalOriginal) * 100 : 0;

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) { next.delete(index); } else { next.add(index); }
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Render — Upload phase
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {SignInModal}

      {/* ── Upload phase ─────────────────────────────────────────────────── */}
      {!results && !loading && (
        <>
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            className="cursor-pointer rounded-3xl border-2 border-dashed border-border bg-white p-8 text-center transition hover:border-primary/50 hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-card"
            aria-label="Upload images for compression"
          >
            <input
              ref={inputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <div className="flex flex-col items-center gap-3 py-5">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-light">
                <Upload className="h-6 w-6 text-primary" />
              </span>
              <p className="font-semibold text-text">Drop images here, or browse</p>
              <p className="text-xs text-text-subtle">
                JPG · PNG · WEBP · GIF · HEIC · AVIF · up to 25 MB per file · 100 MB combined
              </p>
            </div>
          </div>

          {/* Batch limit hint (no files yet) */}
          {!files.length && (
            <BatchLimitHint
              slug={slug}
              limit={batchLimit}
              plan={plan}
              allLimits={allLimits}
              canUpgrade={canUpgrade}
              loading={limitLoading}
              className="px-1"
            />
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-text">
                    {files.length} image{files.length === 1 ? '' : 's'} selected
                  </h2>
                  <p className="text-xs text-text-subtle">
                    {formatBytes(files.reduce((s, f) => s + f.size, 0))} total
                    {isOverHardMax && (
                      <span className="ml-1.5 font-medium text-red-600 dark:text-red-400">
                        · {filesOverHardMax.length} beyond hard max
                      </span>
                    )}
                    {!isOverHardMax && isOverLimit && (
                      <span className="ml-1.5 font-medium text-amber-600 dark:text-amber-400">
                        · {files.length - processingLimit} need credits
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
                >
                  <Upload className="h-3.5 w-3.5" /> Add More
                </button>
              </div>

              <ul className="space-y-2" aria-label="Selected images">
                {files.map((f, i) => {
                  const isBeyondHardMax = i >= hardBatchLimit;
                  const isExcess = i >= processingLimit; // includes isBeyondHardMax
                  const thumbUrl = URL.createObjectURL(f);
                  return (
                    <li
                      key={`${f.name}-${f.lastModified}-${i}`}
                      className={cn(
                        'flex items-center gap-3 rounded-xl p-3',
                        isBeyondHardMax
                          ? 'bg-red-50 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-800/50'
                          : isExcess
                          ? 'bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800/50'
                          : 'bg-surface',
                      )}
                    >
                      {/* Thumbnail */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbUrl}
                        alt=""
                        aria-hidden
                        onLoad={() => URL.revokeObjectURL(thumbUrl)}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{f.name}</p>
                        <p className="text-xs text-text-subtle">
                          {formatBytes(f.size)}
                          {isBeyondHardMax && (
                            <span className="ml-1.5 text-red-600 dark:text-red-400">· must remove</span>
                          )}
                          {!isBeyondHardMax && isExcess && (
                            <span className="ml-1.5 text-amber-600 dark:text-amber-400">· needs credits</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="rounded p-1.5 text-text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Block C — Within hard max, over plan limit, credits sufficient */}
              {!isOverHardMax && isOverPlanLimit && canAffordBatch && authenticated && confirmedCost > 0 && totalCredits !== null && (
                <div role="status" className="rounded-2xl border border-primary/20 bg-primary-light p-4 text-sm text-text">
                  <p className="font-semibold">Your credits cover this larger batch</p>
                  <p className="mt-1 text-text-muted">
                    Your {PLAN_LABEL[plan]} plan allows {batchLimit} image{batchLimit === 1 ? '' : 's'} per batch. Processing all {processableCount} costs up to {confirmedCost} credit{confirmedCost === 1 ? '' : 's'}; failed files are not charged. You have {totalCredits}, leaving {totalCredits - confirmedCost} after if every file succeeds.
                  </p>
                </div>
              )}

              {/* Block A — Hard max exceeded: must remove files */}
              {isOverHardMax && (
                <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-semibold">
                    Hard maximum exceeded — remove {filesOverHardMax.length} image{filesOverHardMax.length === 1 ? '' : 's'}
                  </p>
                  <p className="mt-1 text-amber-800 dark:text-amber-300">
                    This tool supports at most {hardBatchLimit} images per batch regardless of plan or credits. Remove the highlighted files to continue.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFiles((p) => p.slice(0, hardBatchLimit))}
                      className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                    >
                      Remove {filesOverHardMax.length} image{filesOverHardMax.length === 1 ? '' : 's'}
                    </button>
                  </div>
                </div>
              )}

              {/* Block B — Within hard max, over plan limit, insufficient credits.
                  Only shown when cost and balance are both known (not during load or billing error). */}
              {!isOverHardMax && !canAffordBatch && authenticated && totalCredits !== null && imageToolCreditCost !== null && (
                <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-semibold">Not enough credits for this batch</p>
                  <p className="mt-1 text-amber-800 dark:text-amber-300">
                    Processing {processableCount} image{processableCount === 1 ? '' : 's'} needs up to {confirmedCost} credit{confirmedCost === 1 ? '' : 's'}, but you have {totalCredits}. You can process {processingLimit} now; failed files are not charged.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setFiles((p) => p.slice(0, processingLimit)); requestKeyRef.current = null; }}
                      className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                    >
                      Remove {files.length - processingLimit} image{files.length - processingLimit === 1 ? '' : 's'}
                    </button>
                    <Link href="/pricing" className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white">
                      Buy Credits Or Upgrade
                    </Link>
                  </div>
                </div>
              )}

              {/* Block D — Unauthenticated over-limit */}
              {isOverLimit && !authenticated && (
                <BatchLimitWarning
                  selectedCount={files.length}
                  limit={processingLimit}
                  plan={plan}
                  allLimits={allLimits}
                  canUpgrade={canUpgrade}
                  excessFileNames={files.slice(processingLimit).map((f) => f.name)}
                  onRemoveExcess={removeExcess}
                />
              )}

              {/* Batch limit hint (files present, within limit) */}
              {!isOverLimit && (
                <BatchLimitHint
                  slug={slug}
                  limit={batchLimit}
                  plan={plan}
                  allLimits={allLimits}
                  canUpgrade={canUpgrade}
                  loading={limitLoading}
                />
              )}

              {/* Quality slider */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="quality-slider"
                    className="text-xs font-semibold uppercase tracking-wider text-text-subtle"
                  >
                    Quality
                  </label>
                  <span className="font-mono text-xs text-text-muted">{quality}</span>
                </div>
                <input
                  id="quality-slider"
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => { setQuality(parseInt(e.target.value, 10)); requestKeyRef.current = null; }}
                  className="mt-2 w-full accent-primary"
                />
                <p className="mt-1 text-[11px] text-text-subtle">
                  Lower = smaller file. 75–85 is visually lossless for most photos. PNG stays lossless regardless.
                </p>
              </div>

              <Button
                onClick={compress}
                disabled={loading || !planReady || isOverHardMax || processingLimit === 0}
                className="w-full"
                size="lg"
              >
                {isOverHardMax
                  ? 'Remove Excess To Compress'
                  : isOverLimit
                  ? `Compress ${processingLimit} of ${files.length} images`
                  : `Compress ${files.length} image${files.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}

      {/* ── Processing phase ─────────────────────────────────────────────── */}
      {loading && <ProcessingProgress stage={uploading ? `Uploading ${Math.min(files.length, processingLimit)} image${Math.min(files.length, processingLimit) === 1 ? '' : 's'}…` : processingPercent === 100 ? 'Preparing results…' : `Compressing ${Math.min(files.length, processingLimit)} image${Math.min(files.length, processingLimit) === 1 ? '' : 's'}…`} percent={uploading ? null : processingPercent} detail={!uploading && processedCount > 0 ? `${processedCount} of ${totalCount} complete` : undefined} />}

      {/* ── Results phase ────────────────────────────────────────────────── */}
      {results && !loading && (
        <div className="space-y-5">
          {/* Summary card */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-soft-lg dark:bg-card">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Savings ring */}
              {successfulResults.length > 0 && totalOriginal > 0 && (
                <div className="flex justify-center sm:shrink-0">
                  <SavingsRing pct={overallPct} />
                </div>
              )}

              {/* Stats grid */}
              <div className="flex-1 space-y-3">
                <CompressionSummaryTitle succeeded={successfulResults.length} total={results.length} />
                {successfulResults.length > 0 && totalOriginal > 0 && (
                  <CompressionSummaryStats original={totalOriginal} compressed={totalCompressed} saved={totalSaved} reduction={overallPct} />
                )}
                {failedResults.length > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {failedResults.length} file{failedResults.length === 1 ? '' : 's'} failed — see below.
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" onClick={reset}>
                <RefreshCw className="h-4 w-4" /> Compress More Images
              </Button>

              {failedInputs.length > 0 && (
                <Button variant="outline" onClick={retryFailed}>
                  <RefreshCw className="h-4 w-4" /> Retry {failedInputs.length} Failed
                </Button>
              )}

              {successfulResults.length >= 2 && (
                <button
                  type="button"
                  onClick={downloadZip}
                  disabled={zipping}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:opacity-90 disabled:opacity-60"
                  aria-busy={zipping}
                >
                  {zipping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  {zipping ? 'Building ZIP…' : 'Download All As ZIP'}
                </button>
              )}
            </div>
          </div>

          {/* Per-file cards */}
          <ul className="space-y-2" aria-label="Compression results">
            {results.map((result, index) => {
              const isExpanded = expandedCards.has(index);
              const succeeded = result.status === 'completed';
              const fileSaved = succeeded && result.originalSize && result.size
                ? result.originalSize - result.size
                : 0;
              const filePct = succeeded && result.originalSize && result.originalSize > 0
                ? (fileSaved / result.originalSize) * 100
                : 0;

              return (
                <li
                  key={`${result.sourceName}-${index}`}
                  className="rounded-2xl border border-border bg-white shadow-soft dark:bg-card"
                >
                  {/* Card header */}
                  <button
                    type="button"
                    onClick={() => toggleCard(index)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                    aria-expanded={isExpanded}
                  >
                    {succeeded ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-hover" aria-label="Compressed" />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 text-red-500" aria-label="Failed" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{result.name}</p>
                      {succeeded && result.originalSize && result.size ? (
                        <p className="text-xs text-text-muted">
                          {formatBytes(result.originalSize)} → {formatBytes(result.size)}
                          {filePct > 0 && (
                            <span className="ml-1.5 font-semibold text-primary">↓ {filePct.toFixed(1)}%</span>
                          )}
                          {filePct < 0 && (
                            <span className="ml-1.5 font-semibold text-amber-600">↑ {Math.abs(filePct).toFixed(1)}%</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-red-500">{result.error}</p>
                      )}
                    </div>

                    {/* Individual download */}
                    {succeeded && result.url && (
                      <a
                        href={result.url}
                        download={result.name}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-brand px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90"
                        aria-label={`Download ${result.name}`}
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    )}

                    {/* Expand toggle */}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3">
                      {succeeded && result.url ? (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          {/* Preview */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={result.url}
                            alt={result.name}
                            className="max-h-48 max-w-full rounded-xl object-contain sm:max-w-[200px]"
                          />
                          <div className="space-y-1.5 text-sm">
                            <p>
                              <span className="text-text-muted">Original: </span>
                              <span className="font-semibold text-text">{formatBytes(result.originalSize ?? 0)}</span>
                            </p>
                            <p>
                              <span className="text-text-muted">Compressed: </span>
                              <span className="font-semibold text-text">{formatBytes(result.size ?? 0)}</span>
                            </p>
                            {fileSaved > 0 && (
                              <p>
                                <span className="text-text-muted">Saved: </span>
                                <span className="font-semibold text-primary">
                                  {formatBytes(fileSaved)} ({filePct.toFixed(1)}%)
                                </span>
                              </p>
                            )}
                            <p className="text-xs text-text-muted">{result.mimeType}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{result.error ?? 'Processing failed.'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Privacy note */}
          <div className="flex items-start gap-2 rounded-2xl border border-border bg-surface p-4 text-xs text-text-muted">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" aria-hidden />
            <p>
              Your images are processed securely and never stored on our servers. Files are compressed in
              memory and delivered directly to you.
            </p>
          </div>

          {/* Continue-with section */}
          <div className="rounded-2xl border border-border bg-white p-5 dark:bg-card">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-subtle">
              Continue with
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CONTINUE_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-text transition hover:border-primary/40 hover:bg-primary-light"
                >
                  <ImageIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">{label}</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
