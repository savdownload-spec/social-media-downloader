'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Info, Loader2, Maximize2 } from 'lucide-react';
import { useSignInGuard } from '@/hooks/useSignInGuard';
import { ImageToolError, ImageToolProgress, ImageUploadZone, imageApiError } from '@/components/tools/image/ImageToolUI';

const MAX_INPUT_DIM = 2000;
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
  const isProcessing = state === 'authorizing' || state === 'processing';

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [previewUrl, resultUrl]);

  function clear() {
    setFile(null); setPreviewUrl(null); setResultUrl(null); setResultSize(''); setState('idle'); setError(null);
    operationKeyRef.current = null;
  }

  function handleFile(selected: File) {
    if (selected.size > MAX_FILE_BYTES) { setFile(null); setPreviewUrl(null); setError(`File too large. Maximum size is 5 MB (this file is ${formatBytes(selected.size)}).`); return; }
    if (!/^image\/(jpeg|png|webp)$/i.test(selected.type)) { setFile(null); setPreviewUrl(null); setError('Only JPG, PNG, and WebP images are supported.'); return; }
    setFile(selected); setError(null); setResultUrl(null); setResultSize(''); setPreviewUrl(URL.createObjectURL(selected));
    operationKeyRef.current = null;
  }

  async function postAction(action: 'authorize' | 'complete' | 'failed', operationKey: string) {
    return fetch('/api/tools/image/image-upscaler', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': operationKey }, body: JSON.stringify({ action }),
    });
  }

  async function handleUpscale() {
    if (!file || !previewUrl) return;
    setError(null);
    const image = new Image(); image.src = previewUrl;
    try {
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The selected image could not be decoded.')); });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The selected image could not be decoded.'); setState('error'); return;
    }
    if (image.naturalWidth > MAX_INPUT_DIM || image.naturalHeight > MAX_INPUT_DIM) {
      setError(`Image dimensions too large. Maximum supported size is ${MAX_INPUT_DIM}×${MAX_INPUT_DIM} pixels.`); setState('error'); return;
    }
    if (!(await requireAuth())) return;
    setState('authorizing');
    const operationKey = operationKeyRef.current ?? `upscale:${crypto.randomUUID()}`;
    operationKeyRef.current = operationKey;
    try {
      const authorization = await postAction('authorize', operationKey);
      if (!authorization.ok) { setError(await imageApiError(authorization, 'Could not authorize. Please try again.')); setState('error'); return; }
    } catch {
      setError('Network error. Please check your connection and try again.'); setState('error'); return;
    }

    setState('processing');
    try {
      const outW = image.naturalWidth * scale; const outH = image.naturalHeight * scale;
      const canvas = document.createElement('canvas'); canvas.width = outW; canvas.height = outH;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not create an image canvas.');
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'; context.drawImage(image, 0, 0, outW, outH);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Canvas export failed.')), 'image/png'));
      const completion = await postAction('complete', operationKey);
      if (!completion.ok) throw new Error(await imageApiError(completion, 'Could not record the completed operation.'));
      setResultUrl(URL.createObjectURL(blob)); setResultSize(`${outW}×${outH}`); setState('done');
    } catch (caught) {
      void postAction('failed', operationKey).catch(() => undefined);
      setError(caught instanceof Error ? caught.message : 'Upscaling failed. Please try again.'); setState('error');
    }
  }

  function handleDownload() {
    if (!resultUrl || !file) return;
    const anchor = document.createElement('a'); anchor.href = resultUrl;
    anchor.download = `${file.name.replace(/\.[^.]+$/, '')}-${scale}x.png`; anchor.click();
  }

  return (
    <div className="space-y-6">
      {SignInModal}
      <div className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>This is a high-quality browser resize up to 4×, with a maximum 2000×2000 px input. It does not generate new image detail.</span></div>
      <ImageUploadZone file={file} previewUrl={previewUrl} accept="image/jpeg,image/png,image/webp" hint="JPG · PNG · WebP, up to 5 MB and 2000×2000 px" disabled={isProcessing} onSelect={handleFile} onClear={clear} />
      {file && !resultUrl && <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-medium text-text">Scale Factor:</span>{([2, 4] as ScaleFactor[]).map((value) => <button key={value} type="button" onClick={() => { setScale(value); operationKeyRef.current = null; }} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${scale === value ? 'border-primary bg-primary text-white' : 'border-border bg-white text-text hover:border-primary/50 dark:bg-card'}`}>{value}×</button>)}</div>}
      {error && <ImageToolError>{error}</ImageToolError>}
      {isProcessing && <ImageToolProgress>{state === 'authorizing' ? 'Authorizing…' : 'Upscaling…'}</ImageToolProgress>}
      {resultUrl && (
        <div className="space-y-3 rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card">
          <p className="text-sm font-medium text-text">Result ({resultSize} PNG)</p>
          {/* Object URLs cannot be served through next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="Upscaled result" className="mx-auto max-h-64 rounded-xl border border-border object-contain" />
          <button onClick={handleDownload} className="flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow"><Download className="h-4 w-4" /> Download PNG</button>
        </div>
      )}
      {!resultUrl ? <button disabled={!file || isProcessing} onClick={handleUpscale} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{isProcessing ? <><Loader2 className="h-4 w-4 animate-spin" /> {state === 'authorizing' ? 'Authorizing…' : 'Upscaling…'}</> : <><Maximize2 className="h-4 w-4" /> Upscale {scale}×</>}</button> : <button onClick={clear} className="text-sm text-text-muted underline hover:text-text">Process Another Image</button>}
    </div>
  );
}
