'use client';

import { useRef, useState } from 'react';
import { Upload, Download, Maximize2, Loader2, AlertCircle, Info } from 'lucide-react';
import { useSignInGuard } from '@/hooks/useSignInGuard';

const MAX_INPUT_DIM = 2000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
type ScaleFactor = 2 | 4;
type ProcessingState = 'idle' | 'authorizing' | 'processing' | 'done' | 'error';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageUpscalerTool({ slug }: { slug: string }) {
  const { requireAuth, SignInModal } = useSignInGuard();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [scale, setScale] = useState<ScaleFactor>(2);
  const [state, setState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(selected: File) {
    if (selected.size > MAX_FILE_BYTES) {
      setError(`File too large. Maximum size is 5 MB (this file is ${formatBytes(selected.size)}).`);
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/i.test(selected.type)) {
      setError('Only JPG, PNG, and WebP images are supported.');
      return;
    }
    setFile(selected);
    setError(null);
    setResultUrl(null);
    setResultSize('');
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
  }

  async function handleUpscale() {
    if (!file || !previewUrl) return;
    const authed = await requireAuth();
    if (!authed) return;

    setState('authorizing');
    setError(null);

    try {
      const res = await fetch('/api/tools/image/image-upscaler', { method: 'POST' });
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

    setState('processing');

    try {
      const img = new Image();
      img.src = previewUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
      });

      if (img.naturalWidth > MAX_INPUT_DIM || img.naturalHeight > MAX_INPUT_DIM) {
        setError(`Image dimensions too large. Maximum supported size is ${MAX_INPUT_DIM}×${MAX_INPUT_DIM} pixels.`);
        setState('error');
        return;
      }

      const outW = img.naturalWidth * scale;
      const outH = img.naturalHeight * scale;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, outW, outH);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/png');
      });

      setResultUrl(URL.createObjectURL(blob));
      setResultSize(`${outW}×${outH}`);
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upscaling failed. Please try again.');
      setState('error');
    }
  }

  function handleDownload() {
    if (!resultUrl || !file) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = file.name.replace(/\.[^.]+$/, '') + `-${scale}x.png`;
    a.click();
  }

  const isProcessing = state === 'authorizing' || state === 'processing';

  return (
    <div className="space-y-6">
      {SignInModal}

      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>High-quality resize using browser processing. Supports images up to 2000×2000 px input. Processing is done in your browser.</span>
      </div>

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
            <p className="text-xs text-gray-500">JPG, PNG, WebP — max 5 MB, max 2000×2000 px</p>
          </div>
        )}
      </div>

      {/* Scale selector */}
      {file && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Scale factor:</span>
          {([2, 4] as ScaleFactor[]).map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
                scale === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {state === 'authorizing' ? 'Authorizing…' : 'Upscaling…'}
        </div>
      )}

      {resultUrl && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Result ({resultSize} PNG):</p>
          <img src={resultUrl} alt="Result" className="mx-auto max-h-48 rounded-lg object-contain border border-gray-200" />
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </button>
        </div>
      )}

      {!resultUrl && (
        <button
          disabled={!file || isProcessing}
          onClick={handleUpscale}
          className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 text-sm font-medium transition-colors"
        >
          {isProcessing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {state === 'authorizing' ? 'Authorizing…' : 'Upscaling…'}</>
          ) : (
            <><Maximize2 className="h-4 w-4" /> Upscale {scale}×</>
          )}
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
