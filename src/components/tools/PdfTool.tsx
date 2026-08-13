'use client';
/**
 * PdfTool, client UI for all pdf-lib-based PDF operations.
 * One component serves all five PDF-tool slugs; the `slug` prop selects the
 * endpoint and controls shown.
 *
 * Architecture: Frontend → /api/tools/pdf/<op> → pdfService.ts → pdf-lib / Sharp
 *
 * Ops & endpoints:
 *   merge-pdf    → /api/tools/pdf/merge    (multi-file PDF → one PDF)
 *   split-pdf    → /api/tools/pdf/split    (one PDF + ranges → one or many PDFs)
 *   compress-pdf → /api/tools/pdf/compress (one PDF → smaller PDF)
 *   jpg-to-pdf   → /api/tools/pdf/jpg-to-pdf (multi image → one PDF)
 *   pdf-to-jpg   → /api/tools/pdf/pdf-to-jpg (one PDF → one or many JPGs)
 */
import { useCallback, useRef, useState } from 'react';
import { Upload, Loader2, Download, AlertCircle, FileText, X, Files } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { FunctionalToolProps } from '@/config/functionalTools';

type Op = 'merge' | 'split' | 'compress' | 'jpg-to-pdf' | 'pdf-to-jpg';

const SLUG_TO_OP: Record<string, Op> = {
  'merge-pdf':    'merge',
  'split-pdf':    'split',
  'compress-pdf': 'compress',
  'jpg-to-pdf':   'jpg-to-pdf',
  'pdf-to-jpg':   'pdf-to-jpg',
};

const MAX_BYTES = 50 * 1024 * 1024; // per file

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

type ResultFile = { name: string; url: string; size?: number };

export function PdfTool({ slug }: FunctionalToolProps) {
  const op = SLUG_TO_OP[slug] ?? 'merge';
  const { success, error: errToast } = useToast();

  const [files, setFiles] = useState<File[]>([]);
  const [ranges, setRanges] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ResultFile[] | null>(null);
  const [origSize, setOrigSize] = useState(0);
  const [outSize, setOutSize] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  /* Per-op behaviour */
  const isMulti = op === 'merge' || op === 'jpg-to-pdf';   // multiple input files
  const wantsImages = op === 'jpg-to-pdf';                 // accept images
  const wantsPdf = op === 'merge' || op === 'split' || op === 'compress' || op === 'pdf-to-jpg';
  const showRanges = op === 'split';
  const accept = wantsImages ? 'image/*' : wantsPdf ? '.pdf,application/pdf' : '*';

  const acceptLabel = wantsImages
    ? 'JPG · PNG · WEBP · GIF'
    : wantsPdf
      ? 'PDF files'
      : 'Files';

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setError('');
    setResults(null);
    const valid = Array.from(incoming).filter((f) => {
      if (f.size > MAX_BYTES) {
        setError(`${f.name} exceeds the 50 MB limit and was skipped.`);
        return false;
      }
      return true;
    });
    setFiles((prev) => isMulti ? [...prev, ...valid] : valid.slice(0, 1));
  }, [isMulti]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
  }, [addFiles]);

  const removeAt = useCallback((i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const move = useCallback((i: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]!];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    setResults(null);
    setError('');
    setRanges('');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const process = useCallback(async () => {
    if (files.length === 0) {
      setError('Please add at least one file.');
      return;
    }
    if (op === 'merge' && files.length < 2) {
      setError('Merging needs at least 2 PDFs.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fd = new FormData();
      if (isMulti) {
        for (const f of files) fd.append('files', f);
      } else {
        fd.append('file', files[0]!);
        if (showRanges && ranges.trim()) fd.append('ranges', ranges.trim());
      }

      const endpoint =
        op === 'merge'    ? '/api/tools/pdf/merge' :
        op === 'split'    ? '/api/tools/pdf/split' :
        op === 'compress' ? '/api/tools/pdf/compress' :
        op === 'jpg-to-pdf' ? '/api/tools/pdf/jpg-to-pdf' :
        '/api/tools/pdf/pdf-to-jpg';

      const res = await fetch(endpoint, { method: 'POST', body: fd });
      const ctype = res.headers.get('content-type') || '';

      if (!res.ok) {
        const data = ctype.includes('json') ? await res.json().catch(() => ({})) : {};
        const msg = (data as { error?: string }).error || `Request failed (${res.status}).`;
        setError(msg);
        errToast('Processing failed', msg);
        setLoading(false);
        return;
      }

      // JSON manifest → multiple files
      if (ctype.includes('application/json')) {
        const data = await res.json() as { ok?: boolean; files?: { name: string; base64: string; size?: number }[] };
        const built: ResultFile[] = (data.files || []).map((f) => ({
          name: f.name,
          size: f.size,
          url: `data:application/octet-stream;base64,${f.base64}`,
        }));
        setResults(built);
        success('Ready', `${built.length} file${built.length === 1 ? '' : 's'} generated.`);
        setLoading(false);
        return;
      }

      // Binary → single file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const oSize = parseInt(res.headers.get('X-Original-Size') || '0', 10) || files[0]!.size;
      const nSize = parseInt(res.headers.get('X-Output-Size') || '0', 10) || blob.size;
      const disposition = res.headers.get('Content-Disposition') || '';
      const nameMatch = disposition.match(/filename="([^"]+)"/);
      const name = nameMatch?.[1] || 'document';

      setResults([{ name, url, size: nSize }]);
      setOrigSize(oSize);
      setOutSize(nSize);
      success('Ready', 'Your file is ready to download.');
    } catch {
      setError('Network error. Please try again.');
      errToast('Network error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [files, op, isMulti, showRanges, ranges, success, errToast]);

  const delta = origSize && outSize ? ((origSize - outSize) / origSize) * 100 : 0;
  const smaller = delta > 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Dropzone */}
      {!results && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-3xl border-2 border-dashed border-border bg-white hover:border-primary/40 hover:bg-primary-light/20 transition-all duration-200 p-8 text-center"
        >
          <input ref={inputRef} type="file" accept={accept} multiple={isMulti} className="hidden" onChange={onPick} />
          <div className="py-4 flex flex-col items-center gap-3">
            <span className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </span>
            <p className="font-semibold text-text">
              {isMulti ? `Drop ${acceptLabel} here, or click to browse` : `Drop a ${acceptLabel} file here, or click to browse`}
            </p>
            <p className="text-xs text-text-subtle">{isMulti ? 'Add multiple files, order matters' : 'Up to 50 MB per file'}</p>
          </div>
        </div>
      )}

      {/* File list */}
      {!results && files.length > 0 && (
        <div className="p-5 rounded-2xl border border-border bg-white shadow-soft space-y-4">
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
                <span className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{f.name}</p>
                  <p className="text-xs text-text-subtle">{formatBytes(f.size)}</p>
                </div>
                {isMulti && files.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => move(i, -1)} disabled={i === 0}
                      className="w-7 h-7 rounded-lg text-text-muted hover:bg-white disabled:opacity-30 text-xs"
                      aria-label="Move up"
                    >↑</button>
                    <button
                      onClick={() => move(i, 1)} disabled={i === files.length - 1}
                      className="w-7 h-7 rounded-lg text-text-muted hover:bg-white disabled:opacity-30 text-xs"
                      aria-label="Move down"
                    >↓</button>
                  </div>
                )}
                <button
                  onClick={() => removeAt(i)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>

          {showRanges && (
            <div>
              <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Page ranges (optional)</label>
              <input
                type="text" value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder="e.g. 1-3,5,7-9"
                className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-text-subtle">Each comma-separated range becomes a separate file. Leave blank to split every page.</p>
            </div>
          )}

          <Button onClick={process} loading={loading} className="w-full" size="lg">
            {loading ? 'Processing…' : <>Process <FileText className="w-4 h-4" /></>}
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 p-6 bg-white border border-border rounded-2xl shadow-soft text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm">Processing your files…</span>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="p-5 md:p-6 bg-white border border-border rounded-2xl shadow-soft-lg">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-11 h-11 rounded-xl bg-accent-light flex items-center justify-center">
              {results.length > 1 ? <Files className="w-5 h-5 text-accent-hover" /> : <FileText className="w-5 h-5 text-accent-hover" />}
            </span>
            <div>
              <h3 className="font-semibold text-text">
                {results.length > 1 ? `${results.length} files ready` : 'Your file is ready'}
              </h3>
              {results.length === 1 && origSize && outSize && (
                <div className="text-sm text-text-muted">
                  {formatBytes(origSize)} → {formatBytes(outSize)}{' '}
                  <span className={cn('font-semibold', smaller ? 'text-accent-hover' : 'text-amber-600')}>
                    {smaller ? '↓' : '↑'} {Math.abs(delta).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <ul className="space-y-2 mb-4">
            {results.map((r, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{r.name}</p>
                  {r.size ? <p className="text-xs text-text-subtle">{formatBytes(r.size)}</p> : null}
                </div>
                <a
                  href={r.url}
                  download={r.name}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-brand text-white text-xs font-semibold shadow-glow hover:opacity-90 transition-opacity"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </li>
            ))}
          </ul>

          <Button variant="outline" size="md" onClick={reset}>Process another</Button>
        </div>
      )}
    </div>
  );
}
