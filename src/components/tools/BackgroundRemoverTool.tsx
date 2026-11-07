'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, ImageOff, Info } from 'lucide-react';
import { ProcessingProgress } from '@/components/tools/ProcessingProgress';
import { BackgroundRemovalClient } from '@/lib/background-removal/client';
import { ImageToolError, ImageUploadZone } from '@/components/tools/image/ImageToolUI';

type ProcessingState = 'idle' | 'loading-model' | 'processing' | 'done' | 'error';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackgroundRemoverTool(_props: { slug: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [state, setState] = useState<ProcessingState>('idle');
  const [modelPercent, setModelPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<BackgroundRemovalClient | null>(null);
  const runRef = useRef(0);
  const [modelDetail, setModelDetail] = useState('The first use loads about 101 MB of model and runtime assets.');
  const [loadingStage, setLoadingStage] = useState('Preparing background remover…');
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const isProcessing = state === 'loading-model' || state === 'processing';

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);
  useEffect(() => () => { runRef.current++; clientRef.current?.dispose(); clientRef.current = null; }, []);

  function clear() {
    setFile(null); setPreviewUrl(null); setResultUrl(null); setState('idle'); setModelPercent(null); setError(null);
  }

  function handleFile(selected: File) {
    setResultUrl(null); setState('idle');
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
  }

  async function handleRemove() {
    if (!file || isProcessing) return;
    const run = ++runRef.current;
    setState('loading-model'); setError(null); setModelPercent(null);
    setLoadingStage('Preparing background remover…');
    setModelDetail('The first use loads about 101 MB of model and runtime assets.');
    clientRef.current ??= new BackgroundRemovalClient();
    try {
      const resultBlob = await clientRef.current.remove(file, (progress) => {
        if (run !== runRef.current) return;
        if (progress.stage === 'processing') {
          setState('processing'); setModelPercent(null);
        } else {
          setState('loading-model');
          const measured = progress.stage === 'download' && progress.total && progress.current !== undefined;
          setModelPercent(measured ? Math.floor(progress.current! / progress.total! * 100) : null);
          setLoadingStage(progress.stage === 'download' ? 'Loading model assets…' : 'Initializing the model and runtime…');
          setModelDetail(measured ? `${formatBytes(progress.current!)} of ${formatBytes(progress.total!)} loaded (download or verified browser cache).` : 'Please keep this page open. The model is ready only after initialization finishes.');
        }
      });
      if (run !== runRef.current) return;
      setResultUrl(URL.createObjectURL(resultBlob)); setState('done');
    } catch (caught) {
      if (run !== runRef.current) return;
      setError(`${caught instanceof Error ? caught.message : 'Background removal failed.'} Check your connection and retry. On low-memory devices, try a smaller image.`);
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
      <div className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /><span>Processing happens entirely in your browser—your image is never uploaded to our servers.</span>
      </div>
      {isMobile && <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Processing may take 30+ seconds on mobile. Keep this tab open.</span></div>}
      <ImageUploadZone file={file} previewUrl={previewUrl} accept="image/jpeg,image/png,image/webp" hint="JPG · PNG · WebP, up to 10 MB" disabled={isProcessing} onSelect={handleFile} onClear={clear} />
      {error && <ImageToolError>{error}</ImageToolError>}
      {isProcessing && <ProcessingProgress stage={state === 'processing' ? 'Removing background…' : loadingStage} percent={state === 'loading-model' ? modelPercent : null} detail={state === 'processing' ? 'Processing locally. Please keep this page open.' : modelDetail} />}
      {isProcessing && <button onClick={() => { runRef.current++; clientRef.current?.dispose(); setState('idle'); setModelPercent(null); }} className="text-sm text-text-muted underline hover:text-text">Cancel</button>}
      {resultUrl && (
        <div className="space-y-3 rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card">
          <p className="text-sm font-medium text-text">Result (transparent background PNG)</p>
          <div className="overflow-hidden rounded-xl border border-border bg-surface [background-image:conic-gradient(#ddd_25%,white_0_50%,#ddd_0_75%,white_0)] [background-size:20px_20px]">
            {/* Object URLs cannot be served through next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt="Background removed result" className="mx-auto max-h-64 object-contain" />
          </div>
          <button onClick={handleDownload} className="flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow"><Download className="h-4 w-4" /> Download PNG</button>
        </div>
      )}
      {!resultUrl ? (
        <button disabled={!file || isProcessing} onClick={handleRemove} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {isProcessing ? 'Processing…' : <><ImageOff className="h-4 w-4" /> {state === 'error' ? 'Retry Background Removal' : 'Remove Background'}</>}
        </button>
      ) : <button onClick={clear} className="text-sm text-text-muted underline hover:text-text">Process Another Image</button>}
    </div>
  );
}
