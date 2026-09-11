'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { AlertCircle, CheckCircle2, Download, FileArchive, FileText, Files, Loader2, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { FunctionalToolProps } from '@/config/functionalTools';

type Op = 'merge' | 'split' | 'compress' | 'jpg-to-pdf' | 'pdf-to-jpg';
type SplitMode = 'extract' | 'ranges' | 'every-n' | 'every-page' | 'size';
type ResultFile = { name: string; url: string; size?: number; pageCount?: number };
type ApiManifest = { files?: { name: string; base64: string; size?: number; pageCount?: number }[]; pageCount?: number };

const SLUG_TO_OP: Record<string, Op> = { 'merge-pdf': 'merge', 'split-pdf': 'split', 'compress-pdf': 'compress', 'jpg-to-pdf': 'jpg-to-pdf', 'pdf-to-jpg': 'pdf-to-jpg' };
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;

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
  const [splitMode, setSplitMode] = useState<SplitMode>('every-page');
  const [ranges, setRanges] = useState('');
  const [separate, setSeparate] = useState(false);
  const [everyN, setEveryN] = useState('2');
  const [targetMB, setTargetMB] = useState('5');
  const [compression, setCompression] = useState('recommended');
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [maxPages, setMaxPages] = useState('10');

  const isMulti = op === 'merge' || op === 'jpg-to-pdf';
  const wantsImages = op === 'jpg-to-pdf';
  const wantsPdf = !wantsImages;
  const accept = wantsImages ? 'image/jpeg,image/png,image/webp,image/gif' : 'application/pdf,.pdf';
  const label = wantsImages ? 'JPG, PNG, WEBP or GIF images' : 'PDF files';
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming?.length) return;
    setError(''); setResults(null);
    const incomingFiles = Array.from(incoming);
    const invalid = incomingFiles.find((file) => file.size > MAX_BYTES);
    if (invalid) { setError(`${invalid.name} exceeds the 50 MB per-file limit.`); return; }
    const accepted = incomingFiles.filter((file) => wantsImages ? file.type.startsWith('image/') : file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (accepted.length !== incomingFiles.length) { setError(`Only ${label} are accepted.`); return; }
    if (totalSize + accepted.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) { setError('Combined upload size cannot exceed 150 MB.'); return; }
    setFiles((current) => isMulti ? [...current, ...accepted] : accepted.slice(0, 1));
  }, [isMulti, label, totalSize, wantsImages]);

  const reset = useCallback(() => { abortRef.current?.abort(); setFiles([]); setResults(null); setError(''); setOrigSize(0); setOutSize(0); setPageCount(0); setRanges(''); if (inputRef.current) inputRef.current.value = ''; }, []);
  const move = (index: number, direction: -1 | 1) => setFiles((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target]!, next[index]!]; return next; });
  const removeAt = (index: number) => setFiles((current) => current.filter((_, item) => item !== index));

  const process = useCallback(async () => {
    if (!files.length) { setError('Choose at least one file first.'); return; }
    if (op === 'merge' && files.length < 2) { setError('Merge needs at least 2 PDFs.'); return; }
    if (op === 'split' && ['extract', 'ranges'].includes(splitMode) && !ranges.trim()) { setError('Enter at least one page or range.'); return; }
    setLoading(true); setError(''); setResults(null); abortRef.current = new AbortController();
    try {
      const body = new FormData();
      if (isMulti) files.forEach((file) => body.append('files', file)); else body.append('file', files[0]!);
      if (op === 'split') { body.append('mode', splitMode); body.append('ranges', ranges); body.append('separate', String(separate)); body.append('everyN', everyN); body.append('targetBytes', String(Number(targetMB) * 1024 * 1024)); }
      if (op === 'compress') { body.append('level', compression); body.append('removeMetadata', String(removeMetadata)); }
      if (op === 'pdf-to-jpg') body.append('maxPages', maxPages);
      const endpoint = `/api/tools/pdf/${op}`;
      const response = await fetch(endpoint, { method: 'POST', body, signal: abortRef.current.signal });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) { const payload = contentType.includes('json') ? await response.json().catch(() => ({})) : {}; throw new Error(payload.error || `Processing failed (${response.status}).`); }
      if (contentType.includes('application/json')) {
        const manifest = await response.json() as ApiManifest;
        const built = (manifest.files || []).map((file) => ({ name: file.name, size: file.size, pageCount: file.pageCount, url: URL.createObjectURL(fromBase64(file.base64)) }));
        setResults(built); setPageCount(manifest.pageCount || 0); success('Files ready', `${built.length} output files generated.`);
      } else {
        const blob = await response.blob(); const url = URL.createObjectURL(blob); const size = Number(response.headers.get('X-Output-Size') || blob.size); setResults([{ name: getFilename(response.headers.get('Content-Disposition'), 'savdown-document.pdf'), url, size }]); setOrigSize(Number(response.headers.get('X-Original-Size') || files[0]!.size)); setOutSize(size); setPageCount(Number(response.headers.get('X-Page-Count') || 0)); success('File ready', 'Your processed file is ready to download.');
      }
    } catch (caught) { if ((caught as Error).name !== 'AbortError') { const message = caught instanceof Error ? caught.message : 'Could not process the files.'; setError(message); errToast('Processing failed', message); } }
    finally { setLoading(false); abortRef.current = null; }
  }, [compression, errToast, everyN, files, isMulti, maxPages, op, ranges, removeMetadata, separate, splitMode, success, targetMB]);

  const downloadZip = async () => { if (!results?.length) return; const zip = new JSZip(); await Promise.all(results.map(async (result) => zip.file(result.name, await (await fetch(result.url)).blob()))); const blob = await zip.generateAsync({ type: 'blob' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'savdown-pdf-results.zip'; anchor.click(); URL.revokeObjectURL(url); };
  const reduction = origSize && outSize ? ((origSize - outSize) / origSize) * 100 : 0;

  return <div className="mx-auto w-full max-w-3xl space-y-5">
    {!results && <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }} className="cursor-pointer rounded-3xl border-2 border-dashed border-border bg-white p-8 text-center transition hover:border-primary/50 hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-card" aria-label={`Upload ${label}`}>
      <input ref={inputRef} type="file" accept={accept} multiple={isMulti} className="hidden" onChange={(event) => addFiles(event.target.files)} />
      <div className="flex flex-col items-center gap-3 py-5"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-light"><Upload className="h-6 w-6 text-primary" /></span><p className="font-semibold text-text">Drop {label} here, or browse</p><p className="text-xs text-text-subtle">Up to 50 MB per file · 150 MB combined · files are processed temporarily</p></div>
    </div>}

    {!results && files.length > 0 && <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-text">{isMulti ? 'Source files · order matters' : 'Source file'}</h2><p className="text-xs text-text-subtle">{files.length} file{files.length === 1 ? '' : 's'} · {formatBytes(totalSize)}</p></div>{isMulti && <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" /> Add more</button>}</div>
      <ul className="space-y-2">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 rounded-xl bg-surface p-3"><FileText className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-text">{file.name}</p><p className="text-xs text-text-subtle">{formatBytes(file.size)}</p></div>{isMulti && <div className="flex gap-1"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded px-2 py-1 text-xs text-text-muted disabled:opacity-30" aria-label="Move file up">↑</button><button type="button" onClick={() => move(index, 1)} disabled={index === files.length - 1} className="rounded px-2 py-1 text-xs text-text-muted disabled:opacity-30" aria-label="Move file down">↓</button></div>}<button type="button" onClick={() => removeAt(index)} className="rounded p-1.5 text-text-muted hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${file.name}`}><Trash2 className="h-4 w-4" /></button></li>)}</ul>

      {op === 'split' && <div className="space-y-3 border-t border-border pt-4"><label className="block text-xs font-semibold uppercase tracking-wider text-text-subtle">Split mode<select value={splitMode} onChange={(event) => setSplitMode(event.target.value as SplitMode)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text dark:bg-card"><option value="every-page">One PDF per page</option><option value="extract">Extract selected pages</option><option value="ranges">Split by custom ranges</option><option value="every-n">Split every N pages</option><option value="size">Split by target file size</option></select></label>{(splitMode === 'extract' || splitMode === 'ranges') && <><label className="block text-xs font-semibold text-text-subtle">{splitMode === 'extract' ? 'Pages to extract' : 'Ranges'}<input value={ranges} onChange={(event) => setRanges(event.target.value)} placeholder="1, 3-5, 8" className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text dark:bg-card" /></label>{splitMode === 'extract' && <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={separate} onChange={(event) => setSeparate(event.target.checked)} /> Create one PDF per selected page</label>}<p className="text-xs text-text-subtle">Ranges are validated against the PDF page count before processing.</p></>}{splitMode === 'every-n' && <label className="block text-xs text-text-subtle">Pages per output<input type="number" min="1" value={everyN} onChange={(event) => setEveryN(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text dark:bg-card" /></label>}{splitMode === 'size' && <label className="block text-xs text-text-subtle">Target size in MB<input type="number" min="0.064" step="0.1" value={targetMB} onChange={(event) => setTargetMB(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text dark:bg-card" /></label>}</div>}
      {op === 'compress' && <div className="space-y-3 border-t border-border pt-4"><label className="block text-xs font-semibold uppercase tracking-wider text-text-subtle">Quality and compression<select value={compression} onChange={(event) => setCompression(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text dark:bg-card"><option value="extreme">Extreme · smallest result</option><option value="recommended">Recommended · best balance</option><option value="balanced">Balanced · preserve quality</option><option value="high">High quality · light optimization</option><option value="custom">Custom · preserve structure</option></select></label><p className="text-xs text-text-subtle">SavDown preserves selectable text, links, page sizes and document structure. Image re-encoding is not applied blindly.</p><label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={removeMetadata} onChange={(event) => setRemoveMetadata(event.target.checked)} /> Remove document metadata</label></div>}
      {op === 'pdf-to-jpg' && <label className="block border-t border-border pt-4 text-xs text-text-subtle">Pages to render (maximum 50)<input type="number" min="1" max="50" value={maxPages} onChange={(event) => setMaxPages(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text dark:bg-card" /></label>}
      <div className="flex flex-col gap-2 sm:flex-row"><Button onClick={process} loading={loading} className="flex-1" size="lg">{loading ? 'Uploading and processing…' : `Process ${files.length} file${files.length === 1 ? '' : 's'}`}</Button>{loading && <Button variant="outline" onClick={() => abortRef.current?.abort()} size="lg">Cancel</Button>}</div>
    </div>}

    {error && <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span></div>}
    {loading && <div role="status" className="flex items-center gap-3 rounded-2xl border border-border bg-white p-5 text-sm text-text-muted shadow-soft dark:bg-card"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Processing on the secure PDF worker. Large documents may take a little longer.</div>}

    {results && !loading && <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-light"><CheckCircle2 className="h-5 w-5 text-accent-hover" /></span><div><h2 className="font-semibold text-text">{results.length > 1 ? `${results.length} files ready` : 'Your file is ready'}</h2><p className="text-sm text-text-muted">{pageCount ? `${pageCount} source pages · ` : ''}{results.length > 1 ? 'Download individually or as a ZIP.' : origSize && outSize ? `${formatBytes(origSize)} → ${formatBytes(outSize)} · ${reduction > 0 ? `${reduction.toFixed(1)}% smaller` : 'size preserved'}` : formatBytes(results[0]?.size || 0)}</p></div></div><ul className="space-y-2">{results.map((result) => <li key={result.name} className="flex items-center gap-3 rounded-xl bg-surface p-3"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{result.name}</span><span className="hidden text-xs text-text-subtle sm:inline">{result.size ? formatBytes(result.size) : ''}</span><a href={result.url} download={result.name} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-brand px-3.5 py-2 text-xs font-semibold text-white"><Download className="h-3.5 w-3.5" /> Download</a></li>)}</ul><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /> Process another</Button>{results.length > 1 && <Button variant="outline" onClick={downloadZip}><FileArchive className="h-4 w-4" /> Download ZIP</Button>}</div></div>}
  </div>;
}
