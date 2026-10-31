'use client';
/**
 * ImageTool, client UI for all Sharp-based image operations.
 * One component serves all eight image-tool slugs; the `slug` prop selects
 * which operation is sent to POST /api/tools/image.
 *
 * Architecture: Frontend → /api/tools/image → imageService.ts → Sharp
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, Download, AlertCircle, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { FunctionalToolProps } from '@/config/functionalTools';
import { useSignInGuard } from '@/hooks/useSignInGuard';
import { IMAGE_ACCEPT, isAllowedImageType } from '@/lib/imageConfig';
import { imageApiError } from '@/components/tools/image/ImageToolUI';

type Op =
  | 'compress' | 'resize' | 'convert' | 'enhance'
  | 'jpg-to-png' | 'png-to-jpg' | 'to-webp' | 'heic-to-jpg';

type Format = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif';

const SLUG_TO_OP: Record<string, Op> = {
  'image-compressor': 'compress',
  'image-resizer':    'resize',
  'image-converter':  'convert',
  'image-enhancer':   'enhance',
  'jpg-to-png':       'jpg-to-png',
  'png-to-jpg':       'png-to-jpg',
  'webp-converter':   'to-webp',
  'heic-to-jpg':      'heic-to-jpg',
};

const MAX_BYTES = 25 * 1024 * 1024;

const ACCEPT_BY_OP: Partial<Record<Op, string>> = {
  'jpg-to-png': 'image/jpeg',
  'png-to-jpg': 'image/png',
  'heic-to-jpg': 'image/heic,image/heif',
};

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageTool({ slug }: FunctionalToolProps) {
  const op = SLUG_TO_OP[slug] ?? 'compress';
  const { success, error: errToast } = useToast();
  const { requireAuth, SignInModal } = useSignInGuard();

  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quality, setQuality] = useState(80);
  const [width, setWidth]     = useState<string>('');
  const [height, setHeight]   = useState<string>('');
  const [format, setFormat]   = useState<Format>('png');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Result
  const [resultUrl, setResultUrl]         = useState<string | null>(null);
  const [resultName, setResultName]       = useState('');
  const [origSize, setOrigSize]           = useState(0);
  const [outSize, setOutSize]             = useState(0);
  const [resultDimensions, setResultDimensions] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const operationKeyRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [preview, resultUrl]);

  /* Whether the quality slider should show for this op */
  const showQuality = ['compress', 'png-to-jpg', 'to-webp'].includes(op);
  /* Whether the format dropdown should show (convert only) */
  const showFormat = op === 'convert';
  /* Whether the size inputs should show (resize only) */
  const showSize = op === 'resize';

  const handleFile = useCallback((f: File | null) => {
    setError('');
    setResultDimensions('');
    setResultUrl(null);
    if (!f) { setFile(null); setPreview(null); return; }
    if (f.size > MAX_BYTES) {
      setFile(null);
      setPreview(null);
      setError('File too large. Maximum size is 25 MB.');
      errToast('File too large', 'Maximum image size is 25 MB.');
      return;
    }
    const accepted = ACCEPT_BY_OP[op]?.split(',') ?? [];
    if (!isAllowedImageType(f.type) || (accepted.length > 0 && !accepted.includes(f.type.toLowerCase()))) {
      setFile(null);
      setPreview(null);
      const expected = op === 'jpg-to-png' ? 'a JPG image' : op === 'png-to-jpg' ? 'a PNG image' : op === 'heic-to-jpg' ? 'a HEIC image' : 'a supported image';
      setError(`Please select ${expected}.`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    operationKeyRef.current = null;
  }, [errToast, op]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  }, [handleFile]);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResultUrl(null);
    setError('');
    operationKeyRef.current = null;
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const process = useCallback(async () => {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }
    if (showSize && !width && !height) {
      setError('Enter a width, a height, or both.');
      return;
    }
    if (!requireAuth()) return;
    setLoading(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('op', op);
      if (showQuality) fd.append('quality', String(quality));
      if (showSize) {
        if (width)  fd.append('width', width);
        if (height) fd.append('height', height);
      }
      if (showFormat) fd.append('format', format);

      const operationKey = operationKeyRef.current ?? `image:${crypto.randomUUID()}`;
      operationKeyRef.current = operationKey;
      const res = await fetch('/api/tools/image', { method: 'POST', headers: { 'Idempotency-Key': operationKey }, body: fd });

      if (!res.ok) {
        const msg = await imageApiError(res, `Request failed (${res.status}).`);
        setError(msg);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Read metadata headers
      const oSize = parseInt(res.headers.get('X-Original-Size') || '0', 10) || file.size;
      const nSize = parseInt(res.headers.get('X-Output-Size') || '0', 10) || blob.size;
      const disposition = res.headers.get('Content-Disposition') || '';
      const nameMatch = disposition.match(/filename="([^"]+)"/);
      const name = nameMatch?.[1] || `processed-${file.name.replace(/\.[^.]+$/, '')}`;

      setResultUrl(url);
      setResultName(name);
      setOrigSize(oSize);
      setOutSize(nSize);
      const outputWidth = res.headers.get('X-Output-Width');
      const outputHeight = res.headers.get('X-Output-Height');
      setResultDimensions(outputWidth && outputHeight ? `${outputWidth}×${outputHeight}` : '');
      operationKeyRef.current = null;
      success('Image ready', 'Your processed image is ready to download.');
    } catch {
      setError('Network error. Please try again.');
      errToast('Network error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [requireAuth, file, op, showQuality, showSize, showFormat, quality, width, height, format, success, errToast]);

  const delta = origSize && outSize ? ((origSize - outSize) / origSize) * 100 : 0;
  const smaller = delta > 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {SignInModal}
      {/* Dropzone / preview */}
      {!resultUrl && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-200 p-8 text-center',
            preview ? 'border-primary/40 bg-white dark:bg-card' : 'border-border bg-white dark:bg-card hover:border-primary/40 hover:bg-primary-light',
          )}
        >
          <input ref={inputRef} type="file" accept={ACCEPT_BY_OP[op] ?? IMAGE_ACCEPT} className="hidden" onChange={onPick} />

          {preview ? (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white dark:bg-card shadow-soft-md flex items-center justify-center hover:bg-surface"
                aria-label="Remove Image"
              >
                <X className="w-4 h-4" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={file?.name || 'preview'} className="max-h-72 mx-auto rounded-2xl object-contain" />
              <p className="mt-3 text-xs text-text-muted truncate">{file?.name} · {formatBytes(file?.size || 0)}</p>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center gap-3">
              <span className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </span>
              <p className="font-semibold text-text">Drop an image here, or click to browse</p>
              <p className="text-xs text-text-subtle">JPG · PNG · WEBP · GIF · HEIC, up to 25 MB</p>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {!resultUrl && file && (
        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-card shadow-soft space-y-5">
          {showQuality && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Quality</label>
                <span className="text-xs font-mono text-text-muted">{quality}</span>
              </div>
              <input
                type="range" min={10} max={100} value={quality}
                onChange={(e) => { setQuality(parseInt(e.target.value)); operationKeyRef.current = null; }}
                className="w-full accent-primary"
              />
              <p className="mt-1 text-[11px] text-text-subtle">Lower = smaller file. 75–85 is visually lossless for most photos.</p>
            </div>
          )}

          {showFormat && (
            <div>
              <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Output format</label>
              <div className="flex flex-wrap gap-2">
                {(['png', 'jpeg', 'webp', 'avif', 'gif'] as Format[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setFormat(f); operationKeyRef.current = null; }}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-semibold uppercase transition-all',
                      format === f ? 'bg-primary text-white shadow-glow' : 'bg-surface text-text-muted hover:bg-primary-light',
                    )}
                  >
                    {f === 'jpeg' ? 'JPG' : f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showSize && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Width (px)</label>
                <input
                  type="number" min={1} value={width}
                  onChange={(e) => { setWidth(e.target.value); operationKeyRef.current = null; }}
                  placeholder="auto"
                  className="w-full bg-white dark:bg-card border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Height (px)</label>
                <input
                  type="number" min={1} value={height}
                  onChange={(e) => { setHeight(e.target.value); operationKeyRef.current = null; }}
                  placeholder="auto"
                  className="w-full bg-white dark:bg-card border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-primary"
                />
              </div>
              <p className="col-span-2 text-[11px] text-text-subtle">Leave one field blank to keep the aspect ratio.</p>
            </div>
          )}

          <Button onClick={process} loading={loading} className="w-full" size="lg">
            {loading ? 'Processing…' : <>Process Image <ImageIcon className="w-4 h-4" /></>}
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center gap-3 p-6 bg-white dark:bg-card border border-border rounded-2xl shadow-soft text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm">Processing your image…</span>
        </div>
      )}

      {/* Result */}
      {resultUrl && !loading && (
        <div className="p-5 md:p-6 bg-white dark:bg-card border border-border rounded-2xl shadow-soft-lg">
          <div className="flex flex-col md:flex-row gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt={resultName} className="w-full md:w-52 max-h-52 object-contain rounded-2xl bg-surface" />
            <div className="flex-1 min-w-0 flex flex-col">
              <h3 className="font-semibold text-text leading-snug truncate">{resultName}</h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-text-muted">Original: <span className="font-mono text-text">{formatBytes(origSize)}</span></span>
                <span className="text-text-muted">New: <span className="font-mono text-text">{formatBytes(outSize)}</span></span>
                {resultDimensions && <span className="text-text-muted">Dimensions: <span className="font-mono text-text">{resultDimensions}</span></span>}
                {origSize !== outSize && (
                  <span className={cn('font-semibold', smaller ? 'text-accent-hover' : 'text-amber-600')}>
                    {smaller ? '↓' : '↑'} {Math.abs(delta).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="mt-auto pt-4 flex flex-wrap gap-2">
                <a
                  href={resultUrl}
                  download={resultName}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <Button variant="outline" size="md" onClick={reset}>Process Another</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
