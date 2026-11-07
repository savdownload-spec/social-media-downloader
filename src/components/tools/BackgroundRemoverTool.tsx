'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, ImageOff, Info } from 'lucide-react';
import { ProcessingProgress } from '@/components/tools/ProcessingProgress';
import { useSignInGuard } from '@/hooks/useSignInGuard';
import { ImageToolError, ImageUploadZone, imageApiError } from '@/components/tools/image/ImageToolUI';

type ProcessingState = 'idle' | 'authorizing' | 'loading-model' | 'processing' | 'done' | 'error';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackgroundRemoverTool(_props: { slug: string }) {
  const { requireAuth, SignInModal } = useSignInGuard();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [state, setState] = useState<ProcessingState>('idle');
  const [modelPercent, setModelPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const operationKeyRef = useRef<string | null>(null);
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const isProcessing = state === 'authorizing' || state === 'loading-model' || state === 'processing';

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [previewUrl, resultUrl]);

  function clear() {
    setFile(null); setPreviewUrl(null); setResultUrl(null); setState('idle'); setModelPercent(null); setError(null);
    operationKeyRef.current = null;
  }

  function handleFile(selected: File) {
    if (selected.size > MAX_FILE_BYTES) {
      setFile(null); setPreviewUrl(null);
      setError(`File too large. Maximum size is 10 MB (this file is ${formatBytes(selected.size)}).`);
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/i.test(selected.type)) {
      setFile(null); setPreviewUrl(null);
      setError('Only JPG, PNG, and WebP images are supported.');
      return;
    }
    setFile(selected); setError(null); setResultUrl(null); setPreviewUrl(URL.createObjectURL(selected));
    operationKeyRef.current = null;
  }

  async function postAction(action: 'authorize' | 'complete' | 'failed', operationKey: string) {
    return fetch('/api/tools/image/background-remover', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': operationKey }, body: JSON.stringify({ action }),
    });
  }

  async function handleRemove() {
    if (!file || !(await requireAuth())) return;
    setState('authorizing'); setError(null); setModelPercent(null);
    const operationKey = operationKeyRef.current ?? `background:${crypto.randomUUID()}`;
    operationKeyRef.current = operationKey;

    try {
      const authorization = await postAction('authorize', operationKey);
      if (!authorization.ok) {
        setError(await imageApiError(authorization, 'Could not authorize. Please try again.'));
        setState('error');
        return;
      }
    } catch {
      setError('Network error. Please check your connection and try again.'); setState('error'); return;
    }

    setState('loading-model');
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      setState('processing');
      const resultBlob = await removeBackground(file, {
        model: 'medium', output: { format: 'image/png' },
        progress: (_key: string, current: number, total: number) => {
          if (total > 0) setModelPercent((previous) => Math.max(previous ?? 0, Math.min(99, Math.round((current / total) * 100))));
        },
      });
      const completion = await postAction('complete', operationKey);
      if (!completion.ok) throw new Error(await imageApiError(completion, 'Could not record the completed operation.'));
      setResultUrl(URL.createObjectURL(resultBlob)); setState('done');
    } catch (caught) {
      void postAction('failed', operationKey).catch(() => undefined);
      setError(`Processing failed: ${caught instanceof Error ? caught.message : 'Background removal failed.'}`);
      setState('error');
    }
  }

  function handleDownload() {
    if (!resultUrl || !file) return;
    const anchor = document.createElement('a'); anchor.href = resultUrl;
    anchor.download = `${file.name.replace(/\.[^.]+$/, '')}-no-bg.png`; anchor.click();
  }

  return (
    <div className="space-y-6">
      {SignInModal}
      <div className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /><span>Processing happens entirely in your browser—your image is never uploaded to our servers.</span>
      </div>
      {isMobile && <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Processing may take 30+ seconds on mobile. Keep this tab open.</span></div>}
      <ImageUploadZone file={file} previewUrl={previewUrl} accept="image/jpeg,image/png,image/webp" hint="JPG · PNG · WebP, up to 10 MB" disabled={isProcessing} onSelect={handleFile} onClear={clear} />
      {error && <ImageToolError>{error}</ImageToolError>}
      {isProcessing && <ProcessingProgress stage={state === 'authorizing' ? 'Authorizing…' : state === 'loading-model' ? 'Loading the model…' : modelPercent === null ? 'Removing background…' : 'Loading model assets…'} percent={state === 'processing' ? modelPercent : null} detail="Please keep this page open." />}
      {resultUrl && (
        <div className="space-y-3 rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card">
          <p className="text-sm font-medium text-text">Result (transparent background PNG)</p>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {/* Object URLs cannot be served through next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt="Background removed result" className="mx-auto max-h-64 object-contain" />
          </div>
          <button onClick={handleDownload} className="flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow"><Download className="h-4 w-4" /> Download PNG</button>
        </div>
      )}
      {!resultUrl ? (
        <button disabled={!file || isProcessing} onClick={handleRemove} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {isProcessing ? 'Processing…' : <><ImageOff className="h-4 w-4" /> Remove Background</>}
        </button>
      ) : <button onClick={clear} className="text-sm text-text-muted underline hover:text-text">Process Another Image</button>}
    </div>
  );
}
