'use client';

import { useRef, useState } from 'react';
import { Upload, Download, ImageOff, Loader2, AlertCircle, Info } from 'lucide-react';
import { useSignInGuard } from '@/hooks/useSignInGuard';

type ProcessingState = 'idle' | 'authorizing' | 'loading-model' | 'processing' | 'done' | 'error';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackgroundRemoverTool({ slug }: { slug: string }) {
  const { requireAuth, SignInModal } = useSignInGuard();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [state, setState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  function handleFile(selected: File) {
    if (selected.size > MAX_FILE_BYTES) {
      setError(`File too large. Maximum size is 10 MB (this file is ${formatBytes(selected.size)}).`);
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/i.test(selected.type)) {
      setError('Only JPG, PNG, and WebP images are supported.');
      return;
    }
    setFile(selected);
    setError(null);
    setResultUrl(null);
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
  }

  async function handleRemove() {
    if (!file) return;
    const authed = await requireAuth();
    if (!authed) return;

    setState('authorizing');
    setError(null);
    setProgress('');

    // Deduct credit server-side before processing
    try {
      const res = await fetch('/api/tools/image/background-remover', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error || 'Could not authorize. Please try again.');
        setState('error');
        return;
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
      setState('error');
      return;
    }

    setState('loading-model');
    setProgress('Loading AI model (this may take a moment on first use)…');

    try {
      // Lazy-load — not included in main bundle
      const { removeBackground } = await import('@imgly/background-removal');

      setState('processing');
      setProgress('Removing background…');

      const resultBlob = await removeBackground(file, {
        model: 'medium',
        output: { format: 'image/png' },
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setProgress(`Processing: ${pct}%`);
          }
        },
      });

      const url = URL.createObjectURL(resultBlob);
      setResultUrl(url);
      setState('done');
      setProgress('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Background removal failed.';
      setError(`Processing failed: ${msg}. Please try a different image.`);
      setState('error');
    }
  }

  function handleDownload() {
    if (!resultUrl || !file) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = file.name.replace(/\.[^.]+$/, '') + '-no-bg.png';
    a.click();
  }

  const isProcessing = state === 'authorizing' || state === 'loading-model' || state === 'processing';

  return (
    <div className="space-y-6">
      {SignInModal}

      {/* Privacy notice */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Processing happens entirely in your browser — your image is never uploaded to our servers.</span>
      </div>

      {/* Mobile warning */}
      {isMobile && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Processing may take 30+ seconds on mobile devices. Keep this tab open.</span>
        </div>
      )}

      {/* Upload zone */}
      <div
        className="relative cursor-pointer rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors bg-gray-50 hover:bg-blue-50 p-8 text-center"
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="mx-auto max-h-48 rounded-lg object-contain" />
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto h-10 w-10 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">Drop image here or click to upload</p>
            <p className="text-xs text-gray-500">JPG, PNG, WebP — max 10 MB</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Progress */}
      {isProcessing && progress && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progress}
        </div>
      )}

      {/* Result */}
      {resultUrl && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Result (transparent background PNG):</p>
          <div className="rounded-xl overflow-hidden bg-[url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlNWU3ZWIiLz48cmVjdCB4PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjNmNGY2Ii8+PHJlY3QgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==)] border border-gray-200">
            <img src={resultUrl} alt="Result" className="mx-auto max-h-64 object-contain" />
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </button>
        </div>
      )}

      {/* Action button */}
      {!resultUrl && (
        <button
          disabled={!file || isProcessing}
          onClick={handleRemove}
          className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 text-sm font-medium transition-colors"
        >
          {isProcessing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {state === 'authorizing' ? 'Authorizing…' : state === 'loading-model' ? 'Loading model…' : 'Processing…'}</>
          ) : (
            <><ImageOff className="h-4 w-4" /> Remove Background</>          )}
        </button>
      )}

      {resultUrl && (
        <button
          onClick={() => { setFile(null); setPreviewUrl(null); setResultUrl(null); setState('idle'); setError(null); }}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Process another image
        </button>
      )}
    </div>
  );
}
