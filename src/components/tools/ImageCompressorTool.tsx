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
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { FunctionalToolProps } from '@/config/functionalTools';
import { useSignInGuard } from '@/hooks/useSignInGuard';
import { useBatchLimit } from '@/hooks/useBatchLimit';
import { BatchLimitHint, BatchLimitWarning } from '@/components/tools/BatchLimitGate';

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
  base64?: string;
  url?: string; // object URL created from base64 blob
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

function base64ToBlob(b64: string, mimeType: string): Blob {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
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

// ---------------------------------------------------------------------------
// Savings ring — SVG circle showing overall compression %
// ---------------------------------------------------------------------------

function SavingsRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
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

  // Upload phase state
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(80);
  const [error, setError] = useState('');

  // Processing phase state
  const [loading, setLoading] = useState(false);
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
  const hardBatchLimit = Math.max(allLimits.free, allLimits.pro, allLimits.max, allLimits.lifetime);
  const creditBatchLimit = authenticated && totalCredits !== null && imageToolCreditCost
    ? Math.min(hardBatchLimit, Math.floor(totalCredits / imageToolCreditCost))
    : 0;
  const processingLimit = Math.max(batchLimit, creditBatchLimit);
  const excessFiles = files.slice(processingLimit);
  const isOverLimit = files.length > processingLimit;
  const usesCreditOverflow = files.length > batchLimit && !isOverLimit && authenticated;
  const confirmedCost = imageToolCreditCost ? files.length * imageToolCreditCost : null;

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
      // Filter to image/* only (browser may pass others via drag)
      const images = arr.filter((f) => f.type.startsWith('image/'));
      if (images.length < arr.length) {
        setError(`${arr.length - images.length} non-image file(s) were ignored.`);
      }
      setFiles((prev) => [...prev, ...images]);
    },
    [],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeExcess = useCallback(() => {
    setFiles((prev) => prev.slice(0, processingLimit));
  }, [processingLimit]);

  // ---------------------------------------------------------------------------
  // Compress action
  // ---------------------------------------------------------------------------

  const compress = useCallback(async () => {
    if (!requireAuth()) return;
    if (processingRef.current) return;
    if (!files.length) { setError('Add at least one image first.'); return; }

    const filesToProcess = files.slice(0, processingLimit);
    const idempotencyKey = crypto.randomUUID();

    processingRef.current = true;
    setLoading(true);
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
        headers: { 'Idempotency-Key': `image:${idempotencyKey}` },
        body: formData,
      });

      let data: { ok: boolean; completed?: number; total?: number; files?: CompressResult[]; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}).`);
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Request failed (${res.status}).`);
      }

      setProcessedCount(data.completed ?? 0);

      // Build object URLs from base64
      const built: CompressResult[] = (data.files ?? []).map((item) => {
        if (item.status === 'completed' && item.base64 && item.mimeType) {
          const blob = base64ToBlob(item.base64, item.mimeType);
          return { ...item, url: URL.createObjectURL(blob), base64: undefined };
        }
        return item;
      });

      setResults(built);

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
              accept="image/*"
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
                    {isOverLimit && (
                      <span className="ml-1.5 font-medium text-amber-600 dark:text-amber-400">
                        · {excessFiles.length} over limit
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
                >
                  <Upload className="h-3.5 w-3.5" /> Add more
                </button>
              </div>

              <ul className="space-y-2" aria-label="Selected images">
                {files.map((f, i) => {
                  const isExcess = i >= processingLimit;
                  const thumbUrl = URL.createObjectURL(f);
                  return (
                    <li
                      key={`${f.name}-${f.lastModified}-${i}`}
                      className={cn(
                        'flex items-center gap-3 rounded-xl p-3',
                        isExcess
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
                          {isExcess && (
                            <span className="ml-1.5 text-amber-600 dark:text-amber-400">· over limit</span>
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

              {usesCreditOverflow && confirmedCost !== null && totalCredits !== null && (
                <div role="status" className="rounded-2xl border border-primary/20 bg-primary-light p-4 text-sm text-text">
                  <p className="font-semibold">Your credits allow this larger batch</p>
                  <p className="mt-1 text-text-muted">
                    You&apos;re processing {files.length} images. Your {plan === 'FREE' ? 'Free' : plan === 'LIFETIME' ? 'Lifetime' : plan.charAt(0) + plan.slice(1).toLowerCase()} batch limit includes up to {batchLimit}. Processing all {files.length} costs {confirmedCost} credit{confirmedCost === 1 ? '' : 's'} and will leave {totalCredits - confirmedCost}.
                  </p>
                </div>
              )}

              {/* Batch limit warning */}
              {isOverLimit && authenticated && confirmedCost !== null && totalCredits !== null && (
                <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-semibold">
                    {files.length > hardBatchLimit
                      ? `This batch exceeds the configured ${hardBatchLimit}-image maximum.`
                      : `This batch needs ${confirmedCost} credits; you have ${totalCredits}.`}
                  </p>
                  <p className="mt-1 text-amber-800 dark:text-amber-300">
                    Your plan includes up to {batchLimit} images per batch. Remove {files.length - processingLimit} image{files.length - processingLimit === 1 ? '' : 's'}, or upgrade/buy credits to process a larger eligible batch.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={removeExcess} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                      Remove {files.length - processingLimit} excess image{files.length - processingLimit === 1 ? '' : 's'}
                    </button>
                    <Link href="/pricing" className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white">
                      View plans and credits
                    </Link>
                  </div>
                </div>
              )}

              {isOverLimit && !authenticated && (
                <BatchLimitWarning
                  selectedCount={files.length}
                  limit={processingLimit}
                  plan={plan}
                  allLimits={allLimits}
                  canUpgrade={canUpgrade}
                  excessFileNames={excessFiles.map((f) => f.name)}
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
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="mt-2 w-full accent-primary"
                />
                <p className="mt-1 text-[11px] text-text-subtle">
                  Lower = smaller file. 75–85 is visually lossless for most photos. PNG stays lossless regardless.
                </p>
              </div>

              <Button
                onClick={compress}
                loading={loading}
                className="w-full"
                size="lg"
              >
                {isOverLimit
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
      {loading && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-border bg-white p-5 text-sm text-text-muted shadow-soft dark:bg-card"
        >
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>
            Compressing {Math.min(files.length, processingLimit)} image{Math.min(files.length, processingLimit) === 1 ? '' : 's'}…
            {processedCount > 0 && ` (${processedCount} of ${totalCount} done)`}
          </span>
        </div>
      )}

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
                <h2 className="font-semibold text-text">
                  Compression complete — {successfulResults.length}/{results.length} succeeded
                </h2>
                {successfulResults.length > 0 && totalOriginal > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-text-muted">Original</p>
                      <p className="font-semibold text-text">{formatBytes(totalOriginal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Compressed</p>
                      <p className="font-semibold text-text">{formatBytes(totalCompressed)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Saved</p>
                      <p className="font-semibold text-primary">{formatBytes(Math.max(0, totalSaved))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Reduction</p>
                      <p className={cn('font-semibold', overallPct > 0 ? 'text-primary' : 'text-amber-600')}>
                        {overallPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
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
                <RefreshCw className="h-4 w-4" /> Compress more images
              </Button>

              {failedInputs.length > 0 && (
                <Button variant="outline" onClick={retryFailed}>
                  <RefreshCw className="h-4 w-4" /> Retry {failedInputs.length} failed
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
                  {zipping ? 'Building ZIP…' : 'Download All as ZIP'}
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
