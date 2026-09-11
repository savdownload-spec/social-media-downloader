'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { upload } from '@vercel/blob/client';
import { AlertCircle, CheckCircle2, Download, FileArchive, FileText, Loader2, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { FunctionalToolProps } from '@/config/functionalTools';
import { PDF_MAX_BATCH_BYTES, PDF_MAX_FILE_BYTES } from '@/lib/pdfConfig';
import { useBatchLimit } from '@/hooks/useBatchLimit';
import { BatchLimitHint, BatchLimitWarning } from '@/components/tools/BatchLimitGate';

type Op = 'merge' | 'split' | 'compress' | 'jpg-to-pdf' | 'pdf-to-jpg';
type SplitMode = 'extract' | 'ranges' | 'every-n' | 'every-page' | 'size';
type ResultFile = { name: string; url: string; size?: number; pageCount?: number; group?: string; sourceName?: string };
type FailedFile = { sourceName: string; error: string };
type ApiManifest = { completed?: number; total?: number; files?: any[]; pageCount?: number };

const SLUG_TO_OP: Record<string, Op> = { 'merge-pdf': 'merge', 'split-pdf': 'split', 'compress-pdf': 'compress', 'jpg-to-pdf': 'jpg-to-pdf', 'pdf-to-jpg': 'pdf-to-jpg' };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function fromBase64(base64: string): Blob { const binary = atob(base64); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i); return new Blob([bytes]); }
function getFilename(header: string | null, fallback: string): string { const match = header?.match(/filename="?([^";]+)"?/i); return match?.[1] || fallback; }

export function PdfTool({ slug }: FunctionalToolProps) {
  const op = SLUG_TO_OP[slug] ?? 'merge';
  const { success, error: errToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ResultFile[] | null>(null);
  const [origSize, setOrigSize] = useState(0);
  const [outSize, setOutSize] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [failedFiles, setFailedFiles] = useState<FailedFile[]>([]);
  const [failedInputs, setFailedInputs] = useState<File[]>([]);
  const [batchCompleted, setBatchCompleted] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [splitMode, setSplitMode] = useState<SplitMode>('every-page');
  const [ranges, setRanges] = useState('');
  const [separate, setSeparate] = useState(false);
  const [everyN, setEveryN] = useState('2');
  const [targetMB, setTargetMB] = useState('5');
  const [compression, setCompression] = useState('recommended');
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [maxPages, setMaxPages] = useState('10');
  const [uploadStatus, setUploadStatus] = useState('');

  // Plan-aware batch limit — fetched once, cached across re-renders.
  const { plan, limit: batchLimit, allLimits, canUpgrade, loading: limitLoading } = useBatchLimit(slug);

  const isMulti = true;
  const wantsImages = op === 'jpg-to-pdf';
  const accept = wantsImages ? 'image/jpeg,image/png,image/webp,image/gif' : 'application/pdf,.pdf';
  const label = wantsImages ? 'JPG, PNG, WEBP or GIF images' : 'PDF files';
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  // Files beyond the plan limit — derived, not state, so it is always in sync.
  const excessFiles = files.slice(batchLimit);
  const isOverLimit = files.length > batchLimit;

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming?.length) return;
    setError(''); setResults(null);
    const incomingFiles = Array.from(incoming);

    // Per-file size check — hard limit regardless of plan.
    const tooBig = incomingFiles.find((file) => file.size > PDF_MAX_FILE_BYTES);
    if (tooBig) { setError(`${tooBig.name} exceeds the 50 MB per-file limit.`); return; }

    // File-type check.
    const accepted = incomingFiles.filter((file) =>
      wantsImages
        ? file.type.startsWith('image/')
        : file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
    );
    if (accepted.length !== incomingFiles.length) { setError(`Only ${label} are accepted.`); return; }

    // Combined size check — hard limit regardless of plan.
    if (totalSize + accepted.reduce((sum, file) => sum + file.size, 0) > PDF_MAX_BATCH_BYTES) {
      setError('Combined upload size cannot exceed 150 MB.');
      return;
    }

    // Accept ALL valid files — including those that push past the plan limit.
    // BatchLimitWarning will surface the overflow clearly and let the user
    // decide: remove excess files or upgrade. No silent truncation.
    setFiles((current) => isMulti ? [...current, ...accepted] : accepted.slice(0, 1));
  }, [isMulti, label, totalSize, wantsImages]);

  const reset = useCallback(() => { abortRef.current?.abort(); setFiles([]); setResults(null); setFailedFiles([]); setFailedInputs([]); setBatchCompleted(0); setBatchTotal(0); setUploadStatus(''); setError(''); setOrigSize(0); setOutSize(0); setPageCount(0); setRanges(''); if (inputRef.current) inputRef.current.value = ''; }, []);
  const move = (index: number, direction: -1 | 1) => setFiles((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target]!, next[index]!]; return next; });
  const removeAt = (index: number) => setFiles((current) => current.filter((_, item) => item !== index));
  /** Trim files back to the plan limit so the user can proceed without upgrading. */
  const removeExcess = useCallback(() => setFiles((current) => current.slice(0, batchLimit)), [batchLimit]);

  const process = useCallback(async () => {
    if (!files.length) { setError('Choose at least one file first.'); return; }
    if (op === 'merge' && files.length < 2) { setError('Merge needs at least 2 PDFs.'); return; }
    if (op === 'split' && ['extract', 'ranges'].includes(splitMode) && !ranges.trim()) { setError('Enter at least one page or range.'); return; }
    setLoading(true); setError(''); setResults(null); abortRef.current = new AbortController();
    // Enforce the plan limit server-side as well; silently trim on the client
    // so the submit cannot race ahead if the user ignores the warning.
    const filesToProcess = files.slice(0, batchLimit);
    const uploadedUrls: string[] = [];
    try {
      let requestBody: BodyInit;
      let requestHeaders: HeadersInit = { 'Content-Type': 'application/json' };
      const uploaded: { url: string; name: string; size: number }[] = [];
      for (const [index, file] of filesToProcess.entries()) {
        setUploadStatus(`Uploading ${index + 1}/${filesToProcess.length}: ${file.name}`);
        const blob = await upload(`pdf-jobs/${Date.now()}-${index}-${file.name}`, file, { access: 'private', multipart: true, handleUploadUrl: '/api/tools/pdf/upload', abortSignal: abortRef.current.signal, contentType: file.type });
        uploaded.push({ url: blob.url, name: file.name, size: file.size });
        uploadedUrls.push(blob.url);
      }
      setUploadStatus('Processing uploaded files…');
      const payload: Record<string, unknown> = { files: uploaded };
      if (op === 'split') Object.assign(payload, { mode: splitMode, ranges, separate, everyN: Number(everyN), targetBytes: Number(targetMB) * 1024 * 1024 });
      if (op === 'compress') Object.assign(payload, { level: compression, removeMetadata });
      if (op === 'pdf-to-jpg') payload.maxPages = Number(maxPages);
      requestBody = JSON.stringify(payload);
      const endpoint = `/api/tools/pdf/${op}`;
      const response = await fetch(endpoint, { method: 'POST', body: requestBody, headers: requestHeaders, signal: abortRef.current.signal });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) { const payload = contentType.includes('json') ? await response.json().catch(() => ({})) : {}; throw new Error(payload.error || `Processing failed (${response.status}).`); }
      if (contentType.includes('application/json')) {
        const manifest = await response.json() as ApiManifest;
        const built: ResultFile[] = [];
        const failed: FailedFile[] = [];
        const failedSourceFiles: File[] = [];
        for (const [index, item] of (manifest.files || []).entries()) {
          if (item.status === 'failed') { failed.push({ sourceName: item.sourceName || item.name, error: item.error }); if (filesToProcess[index]) failedSourceFiles.push(filesToProcess[index]!); continue; }
          if (item.outputs) {
            for (const output of item.outputs) built.push({ name: output.name, group: output.group, sourceName: item.sourceName, size: output.size, pageCount: output.pageCount, url: URL.createObjectURL(fromBase64(output.base64)) });
          } else if (item.base64) {
            built.push({ name: item.name, sourceName: item.sourceName, size: item.size, pageCount: item.pageCount, url: URL.createObjectURL(fromBase64(item.base64)) });
          }
        }
        setUploadStatus(''); setResults(built); setFailedFiles(failed); setFailedInputs(failedSourceFiles); setBatchCompleted(manifest.completed || 0); setBatchTotal(manifest.total || filesToProcess.length); setPageCount(manifest.pageCount || 0); success('Batch complete', `${manifest.completed || 0} of ${manifest.total || filesToProcess.length} source files completed.`);
      } else {
        const blob = await response.blob(); const url = URL.createObjectURL(blob); const size = Number(response.headers.get('X-Output-Size') || blob.size); setResults([{ name: getFilename(response.headers.get('Content-Disposition'), 'savdown-document.pdf'), url, size }]); setOrigSize(Number(response.headers.get('X-Original-Size') || files[0]!.size)); setOutSize(size); setPageCount(Number(response.headers.get('X-Page-Count') || 0)); success('File ready', 'Your processed file is ready to download.');
      }
    } catch (caught) {
      if (uploadedUrls.length) void fetch('/api/tools/pdf/jpg-to-pdf/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: uploadedUrls }), keepalive: true }).catch(() => undefined);
      if ((caught as Error).name !== 'AbortError') { const message = caught instanceof Error ? caught.message : 'Could not process the files.'; setError(message); errToast('Processing failed', message); }
    }
    finally { setLoading(false); setUploadStatus(''); abortRef.current = null; }
  }, [batchLimit, compression, errToast, everyN, files, maxPages, op, ranges, removeMetadata, separate, splitMode, success, targetMB]);

  const retryFailed = () => { if (!failedInputs.length) return; setFiles(failedInputs); setResults(null); setFailedFiles([]); setFailedInputs([]); setBatchCompleted(0); setBatchTotal(0); setError(''); };
  const downloadZip = async () => { if (!results?.length) return; const zip = new JSZip(); await Promise.all(results.map(async (result) => zip.file(result.group ? `${result.group}/${result.name}` : result.name, await (await fetch(result.url)).blob()))); const blob = await zip.generateAsync({ type: 'blob' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'savdown-pdf-results.zip'; anchor.click(); URL.revokeObjectURL(url); };
  const reduction = origSize && outSize ? ((origSize - outSize) / origSize) * 100 : 0;

  return <div className="mx-auto w-full max-w-3xl space-y-5">
    {!results && <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }} className="cursor-pointer rounded-3xl border-2 border-dashed border-border bg-white p-8 text-center transition hover:border-primary/50 hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-card" aria-label={`Upload ${label}`}>
      <input ref={inputRef} type="file" accept={accept} multiple={isMulti} className="hidden" onChange={(event) => addFiles(event.target.files)} />
      <div className="flex flex-col items-center gap-3 py-5"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-light"><Upload className="h-6 w-6 text-primary" /></span><p className="font-semibold text-text">Drop {label} here, or browse</p><p className="text-xs text-text-subtle">Up to 50 MB per file · 150 MB combined · files are processed temporarily</p></div>
    </div>}

    {/* Proactive limit hint shown below the uploader (only when no files yet / uploader visible) */}
    {!results && !files.length && (
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

    {!results && files.length > 0 && <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-text">{isMulti ? 'Source files · order matters' : 'Source file'}</h2>
          <p className="text-xs text-text-subtle">
            {files.length} file{files.length === 1 ? '' : 's'} · {formatBytes(totalSize)}
            {isOverLimit && <span className="ml-1.5 font-medium text-amber-600 dark:text-amber-400">· {excessFiles.length} over limit</span>}
          </p>
        </div>
        {isMulti && <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" /> Add more</button>}
      </div>

      <ul className="space-y-2">{files.map((file, index) => {
        const isExcess = index >= batchLimit;
        return <li key={`${file.name}-${file.lastModified}-${index}`} className={cn('flex items-center gap-3 rounded-xl p-3', isExcess ? 'bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800/50' : 'bg-surface')}>
          <FileText className={cn('h-4 w-4 shrink-0', isExcess ? 'text-amber-500' : 'text-primary')} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{file.name}</p>
            <p className="text-xs text-text-subtle">{formatBytes(file.size)}{isExcess && <span className="ml-1.5 text-amber-600 dark:text-amber-400">· over limit</span>}</p>
          </div>
          {isMulti && <div className="flex gap-1"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded px-2 py-1 text-xs text-text-muted disabled:opacity-30" aria-label="Move file up">↑</button><button type="button" onClick={() => move(index, 1)} disabled={index === files.length - 1} className="rounded px-2 py-1 text-xs text-text-muted disabled:opacity-30" aria-label="Move file down">↓</button></div>}
          <button type="button" onClick={() => removeAt(index)} className="rounded p-1.5 text-text-muted hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${file.name}`}><Trash2 className="h-4 w-4" /></button>
        </li>;
      })}</ul>

      {/* Batch limit warning — only when over the plan limit */}
      {isOverLimit && (
        <BatchLimitWarning
          selectedCount={files.length}
          limit={batchLimit}
          plan={plan}
          allLimits={allLimits}
          canUpgrade={canUpgrade}
          excessFileNames={excessFiles.map((f) => f.name)}
          onRemoveExcess={removeExcess}
        />
      )}

      {/* Inline limit hint below the file list (replaces the one under the uploader once files are added) */}
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

      {op === 'split' && <div className="space-y-3 border-t border-border pt-4"><fieldset><legend className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Split mode</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{([['every-page', 'Every page', 'One PDF per page'], ['extract', 'Extract pages', 'Choose selected pages'], ['ranges', 'Custom ranges', 'Split by ranges'], ['every-n', 'Every N pages', 'Fixed page groups'], ['size', 'By file size', 'Target approximate size']] as const).map(([value, title, description]) => <button key={value} type="button" aria-pressed={splitMode === value} onClick={() => setSplitMode(value)} className={cn('min-h-16 rounded-xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40', splitMode === value ? 'border-primary bg-primary-light text-primary shadow-sm' : 'border-border bg-white text-text hover:border-primary/40 dark:bg-card')}><span className="flex items-center gap-2 text-sm font-semibold">{splitMode === value && <CheckCircle2 className="h-4 w-4" />}{title}</span><span className="mt-0.5 block text-[11px] text-text-subtle">{description}</span></button>)}</div></fieldset>{(splitMode === 'extract' || splitMode === 'ranges') && <><label className="block text-xs font-semibold text-text-subtle">{splitMode === 'extract' ? 'Pages to extract' : 'Ranges'}<input value={ranges} onChange={(event) => setRanges(event.target.value)} placeholder="1, 3-5, 8" className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text dark:bg-card" /></label>{splitMode === 'extract' && <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={separate} onChange={(event) => setSeparate(event.target.checked)} /> Create one PDF per selected page</label>}<p className="text-xs text-text-subtle">Ranges are validated against the PDF page count before processing.</p></>}{splitMode === 'every-n' && <label className="block text-xs text-text-subtle">Pages per output<input type="number" min="1" value={everyN} onChange={(event) => setEveryN(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text dark:bg-card" /></label>}{splitMode === 'size' && <label className="block text-xs text-text-subtle">Target size in MB<input type="number" min="0.064" step="0.1" value={targetMB} onChange={(event) => setTargetMB(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text dark:bg-card" /></label>}</div>}
      {op === 'compress' && <div className="space-y-3 border-t border-border pt-4"><fieldset><legend className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Quality &amp; compression</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{([['extreme', 'Extreme', 'Smallest result'], ['recommended', 'Recommended', 'Best balance'], ['balanced', 'Balanced', 'Preserve quality'], ['high', 'High quality', 'Light optimization'], ['custom', 'Custom', 'Preserve structure']] as const).map(([value, title, description]) => <button key={value} type="button" aria-pressed={compression === value} onClick={() => setCompression(value)} className={cn('min-h-16 rounded-xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40', compression === value ? 'border-primary bg-primary-light text-primary shadow-sm' : 'border-border bg-white text-text hover:border-primary/40 dark:bg-card')}><span className="flex items-center gap-2 text-sm font-semibold">{compression === value && <CheckCircle2 className="h-4 w-4" />}{title}</span><span className="mt-0.5 block text-[11px] text-text-subtle">{description}</span></button>)}</div></fieldset><p className="text-xs text-text-subtle">SavDown preserves selectable text, links, page sizes and document structure. Image re-encoding is not applied blindly.</p><label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={removeMetadata} onChange={(event) => setRemoveMetadata(event.target.checked)} /> Remove document metadata</label></div>}
      {op === 'pdf-to-jpg' && <label className="block border-t border-border pt-4 text-xs text-text-subtle">Pages to render (maximum 50)<input type="number" min="1" max="50" value={maxPages} onChange={(event) => setMaxPages(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text dark:bg-card" /></label>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={process} loading={loading} className="flex-1" size="lg">
          {loading
            ? 'Uploading and processing…'
            : isOverLimit
              ? `Process ${batchLimit} of ${files.length} files`
              : `Process ${files.length} file${files.length === 1 ? '' : 's'}`}
        </Button>
        {loading && <Button variant="outline" onClick={() => abortRef.current?.abort()} size="lg">Cancel</Button>}
      </div>
    </div>}

    {error && <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span></div>}
    {loading && <div role="status" className="flex items-center gap-3 rounded-2xl border border-border bg-white p-5 text-sm text-text-muted shadow-soft dark:bg-card"><Loader2 className="h-5 w-5 animate-spin text-primary" /> {uploadStatus || `Processing ${Math.min(files.length, batchLimit)} PDF files sequentially on the secure PDF worker. Large documents may take a little longer.`}</div>}

    {results && !loading && <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-light"><CheckCircle2 className="h-5 w-5 text-accent-hover" /></span><div><h2 className="font-semibold text-text">{batchTotal > 1 ? `Batch complete: ${batchCompleted}/${batchTotal}` : results.length > 1 ? `${results.length} files ready` : 'Your file is ready'}</h2><p className="text-sm text-text-muted">{pageCount ? `${pageCount} source pages · ` : ''}{results.length > 1 ? 'Download individually or as a ZIP.' : origSize && outSize ? `${formatBytes(origSize)} → ${formatBytes(outSize)} · ${reduction > 0 ? `${reduction.toFixed(1)}% smaller` : 'size preserved'}` : formatBytes(results[0]?.size || 0)}</p></div></div>{failedFiles.length > 0 && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"><strong>{failedFiles.length} failed:</strong> {failedFiles.map((file) => `${file.sourceName} — ${file.error}`).join(' · ')}</div>}<ul className="space-y-2">{results.map((result) => <li key={result.name} className="flex items-center gap-3 rounded-xl bg-surface p-3"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{result.name}</span><span className="hidden text-xs text-text-subtle sm:inline">{result.size ? formatBytes(result.size) : ''}</span><a href={result.url} download={result.name} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-brand px-3.5 py-2 text-xs font-semibold text-white"><Download className="h-3.5 w-3.5" /> Download</a></li>)}</ul><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /> Process another</Button>{failedInputs.length > 0 && <Button variant="outline" onClick={retryFailed}>Retry failed files</Button>}{results.length > 1 && <Button variant="outline" onClick={downloadZip}><FileArchive className="h-4 w-4" /> Download ZIP</Button>}</div></div>}
  </div>;
}
