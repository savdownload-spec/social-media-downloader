'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Info, Maximize2 } from 'lucide-react';
import { useSignInGuard } from '@/hooks/useSignInGuard';
import { ImageToolError, ImageUploadZone, imageApiError } from '@/components/tools/image/ImageToolUI';
import { ProcessingProgress } from '@/components/tools/ProcessingProgress';
import { UpscalerClient, type UpscaleResult, type UpscaleProgress } from '@/lib/upscaler/client';
import { validateUpscaleDimensions } from '@/lib/upscaler/config';
import { validateUpscaleFile } from '@/lib/upscaler/input';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
type ScaleFactor = 2 | 4;
type ProcessingState = 'idle' | 'authorizing' | 'processing' | 'done' | 'error';

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageUpscalerTool(_props: { slug: string }) {
  const { requireAuth, SignInModal } = useSignInGuard();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [scale, setScale] = useState<ScaleFactor>(2);
  const [state, setState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState('');
  const operationKeyRef = useRef<string | null>(null);
  const clientRef = useRef<UpscalerClient | null>(null);
  const pendingResultRef = useRef<UpscaleResult | null>(null);
  const busyRef = useRef(false);
  const selectionRef = useRef(0);
  const runRef = useRef(0);
  const [progress, setProgress] = useState<UpscaleProgress>({ stage: 'Preparing AI…', percent: null });
  const isProcessing = state === 'authorizing' || state === 'processing';

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);
  useEffect(() => () => { runRef.current++; selectionRef.current++; clientRef.current?.dispose(); }, []);

  function clear() {
    selectionRef.current++;
    setFile(null); setPreviewUrl(null); setResultUrl(null); setResultSize(''); setState('idle'); setError(null);
    operationKeyRef.current = null; pendingResultRef.current = null;
  }

  async function handleFile(selected: File) {
    if (busyRef.current) return;
    const selection = ++selectionRef.current;
    setFile(null); setPreviewUrl(null); setState('idle'); setResultUrl(null); pendingResultRef.current = null;
    if (selected.size > MAX_FILE_BYTES) { setFile(null); setPreviewUrl(null); setError(`File too large. Maximum size is 5 MB (this file is ${formatBytes(selected.size)}).`); return; }
    if (!/^image\/(jpeg|png|webp)$/i.test(selected.type)) { setFile(null); setPreviewUrl(null); setError('Only JPG, PNG, and WebP images are supported.'); return; }
    // Preview the largest supported 2× input so a 4× rejection can still be changed to 2×.
    try { await validateUpscaleFile(selected, 2); }
    catch (caught) {
      if (selection !== selectionRef.current) return;
      setFile(null); setPreviewUrl(null); setError(caught instanceof Error ? caught.message : 'Invalid image.'); return;
    }
    if (selection !== selectionRef.current) return;
    setFile(selected); setError(null); setResultUrl(null); setResultSize(''); setPreviewUrl(URL.createObjectURL(selected));
    operationKeyRef.current = null; pendingResultRef.current = null;
  }

  async function postAction(action: 'authorize' | 'complete' | 'failed', operationKey: string) {
    const result = action === 'complete' ? pendingResultRef.current : null;
    return fetch('/api/tools/image/image-upscaler', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': operationKey }, body: JSON.stringify({ action, ...(result ? { result: { width: result.width, height: result.height, bytes: result.blob.size, mime: result.blob.type, scale } } : {}) }),
    });
  }

  async function handleUpscale() {
    if (!file || !previewUrl || busyRef.current) return;
    if (!globalThis.crypto?.randomUUID) { setError('Use a current browser over HTTPS for AI processing.'); setState('error'); return; }
    const run = ++runRef.current;
    busyRef.current = true; setError(null); setState('authorizing');
    const operationKey = operationKeyRef.current ?? `upscale:${crypto.randomUUID()}`;
    operationKeyRef.current = operationKey;
    try {
      await validateUpscaleFile(file, scale);
      if (run !== runRef.current) return;
      const image = new Image(); image.src = previewUrl;
      await image.decode();
      if (run !== runRef.current) return;
      validateUpscaleDimensions(image.naturalWidth, image.naturalHeight, scale);
      if (!(await requireAuth())) { setState('idle'); return; }
      // Retain generated pixels when a completion response is lost: retry accounting only.
      if (!pendingResultRef.current) {
        const authorization = await postAction('authorize', operationKey);
        if (run !== runRef.current) return;
        if (!authorization.ok) throw new Error(await imageApiError(authorization, 'Could not authorize. Please try again.'));
        setState('processing'); setProgress({ stage: 'Preparing AI…', percent: null });
        clientRef.current ??= new UpscalerClient();
        try { pendingResultRef.current = await clientRef.current.upscale(file, scale, setProgress); }
        catch (caught) { void postAction('failed', operationKey).catch(() => undefined); operationKeyRef.current = null; throw caught; }
      }
      const result = pendingResultRef.current;
      if (run !== runRef.current) return;
      setState('processing'); setProgress({ stage: 'Recording successful processing…', percent: null });
      const completion = await postAction('complete', operationKey);
      if (run !== runRef.current) return;
      if (!completion.ok) throw new Error(await imageApiError(completion, 'Could not record processing. Retry to save this result.'));
      setResultUrl(URL.createObjectURL(result.blob)); setResultSize(`${result.width}×${result.height}`); setState('done');
      pendingResultRef.current = null;
    } catch (caught) {
      if (run !== runRef.current) return;
      if (!pendingResultRef.current) operationKeyRef.current = null;
      setError(caught instanceof Error ? caught.message : 'Upscaling failed. Please retry.'); setState('error');
    } finally { busyRef.current = false; }
  }

  function handleDownload() {
    if (!resultUrl || !file) return;
    const anchor = document.createElement('a'); anchor.href = resultUrl;
    anchor.download = `${file.name.replace(/\.[^.]+$/, '')}-${scale}x.png`; anchor.click();
  }

  return (
    <div className="space-y-6">
      {SignInModal}
      <div className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>Free local AI processing with ESRGAN Slim. 2× supports up to 1 MP; 4× up to 0.26 MP (512×512). Maximum output: 4 MP. First use loads about 2 MB; large images can take several minutes. AI detail is estimated and can contain artifacts.</span></div>
      <ImageUploadZone file={file} previewUrl={previewUrl} accept="image/jpeg,image/png,image/webp" hint="JPG · PNG · WebP, up to 5 MB · 2×: 1 MP · 4×: 0.26 MP" disabled={isProcessing} onSelect={handleFile} onClear={clear} />
      {file && !resultUrl && <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-medium text-text">Scale Factor:</span>{([2, 4] as ScaleFactor[]).map((value) => <button key={value} type="button" disabled={isProcessing || !!pendingResultRef.current} onClick={() => { setScale(value); operationKeyRef.current = null; }} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${scale === value ? 'border-primary bg-primary text-white' : 'border-border bg-white text-text hover:border-primary/50 dark:bg-card'}`}>{value}×</button>)}</div>}
      {error && <ImageToolError>{error}</ImageToolError>}
      {isProcessing && <ProcessingProgress stage={state === 'authorizing' ? 'Authorizing…' : progress.stage} percent={state === 'authorizing' ? null : progress.percent} detail="Processing locally. Keep this page open." />}
      {state === 'processing' && !pendingResultRef.current && <button onClick={() => clientRef.current?.dispose('Processing cancelled. No credits were charged.')} className="text-sm text-text-muted underline hover:text-text">Cancel</button>}
      {resultUrl && (
        <div className="space-y-3 rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card">
          <p className="text-sm font-medium text-text">Result ({resultSize} PNG)</p>
          {/* Object URLs cannot be served through next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="Upscaled result" className="mx-auto max-h-64 rounded-xl border border-border object-contain" />
          <button onClick={handleDownload} className="flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow"><Download className="h-4 w-4" /> Download PNG</button>
        </div>
      )}
      {!resultUrl ? <button disabled={!file || isProcessing} onClick={handleUpscale} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{isProcessing ? 'Processing…' : <><Maximize2 className="h-4 w-4" /> Upscale {scale}×</>}</button> : <button onClick={clear} className="text-sm text-text-muted underline hover:text-text">Process Another Image</button>}
    </div>
  );
}
