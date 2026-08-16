'use client';
/**
 * VideoTool, client UI for all FFmpeg-based video operations.
 * One component serves five catalog slugs; the `slug` prop selects which
 * operation is sent to POST /api/tools/video.
 *
 * Architecture: Frontend → /api/tools/video → videoService.ts → FFmpeg
 */
import { useCallback, useRef, useState } from 'react';
import { Upload, Loader2, Download, AlertCircle, Film, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { FunctionalToolProps } from '@/config/functionalTools';

type Op = 'convert' | 'compress' | 'to-mp3' | 'to-gif';
type ContainerFormat = 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv';
type Bitrate = '128k' | '192k' | '320k';

const SLUG_TO_OP: Record<string, Op> = {
  'video-converter':  'convert',
  'video-compressor': 'compress',
  'video-to-mp3':     'to-mp3',
  'gif-maker':        'to-gif',
  'mp4-to-gif':       'to-gif',
};

const MAX_BYTES = 100 * 1024 * 1024;

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export function VideoTool({ slug }: FunctionalToolProps) {
  const op = SLUG_TO_OP[slug] ?? 'compress';
  const { success, error: errToast } = useToast();

  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [format, setFormat]   = useState<ContainerFormat>('mp4');
  const [crf, setCrf]         = useState(28);
  const [bitrate, setBitrate] = useState<Bitrate>('192k');
  const [fps, setFps]         = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [resultUrl, setResultUrl]   = useState<string | null>(null);
  const [resultName, setResultName] = useState('');
  const [origSize, setOrigSize]     = useState(0);
  const [outSize, setOutSize]       = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const showFormat  = op === 'convert';
  const showCrf     = op === 'compress';
  const showBitrate = op === 'to-mp3';
  const showGifOpts = op === 'to-gif';

  const handleFile = useCallback((f: File | null) => {
    setError('');
    setResultUrl(null);
    if (!f) { setFile(null); setPreview(null); return; }
    if (f.size > MAX_BYTES) {
      setError('File too large. Maximum size is 100 MB.');
      errToast('File too large', 'Maximum video size is 100 MB.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, [errToast]);

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
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const process = useCallback(async () => {
    if (!file) {
      setError('Please upload a video first.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('op', op);
      if (showFormat)  fd.append('format', format);
      if (showCrf)     fd.append('crf', String(crf));
      if (showBitrate) fd.append('bitrate', bitrate);
      if (showGifOpts) fd.append('fps', String(fps));

      const res = await fetch('/api/tools/video', { method: 'POST', body: fd });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { error?: string }).error || `Request failed (${res.status}).`;
        setError(msg);
        errToast('Processing failed', msg);
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const oSize = parseInt(res.headers.get('X-Original-Size') || '0', 10) || file.size;
      const nSize = parseInt(res.headers.get('X-Output-Size') || '0', 10) || blob.size;
      const disposition = res.headers.get('Content-Disposition') || '';
      const nameMatch = disposition.match(/filename="([^"]+)"/);
      const name = nameMatch?.[1] || `processed-${file.name.replace(/\.[^.]+$/, '')}`;

      setResultUrl(url);
      setResultName(name);
      setOrigSize(oSize);
      setOutSize(nSize);
      success('Video ready', 'Your processed file is ready to download.');
    } catch {
      setError('Network error. Please try again.');
      errToast('Network error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [file, op, showFormat, showCrf, showBitrate, showGifOpts, format, crf, bitrate, fps, success, errToast]);

  const delta = origSize && outSize ? ((origSize - outSize) / origSize) * 100 : 0;
  const smaller = delta > 0;
  const isGifResult = op === 'to-gif';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
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
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onPick} />

          {preview ? (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white dark:bg-card shadow-soft-md flex items-center justify-center hover:bg-surface"
                aria-label="Remove video"
              >
                <X className="w-4 h-4" />
              </button>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={preview} controls className="max-h-72 mx-auto rounded-2xl bg-ink" />
              <p className="mt-3 text-xs text-text-muted truncate">{file?.name} · {formatBytes(file?.size || 0)}</p>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center gap-3">
              <span className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </span>
              <p className="font-semibold text-text">Drop a video here, or click to browse</p>
              <p className="text-xs text-text-subtle">MP4 · WEBM · MOV · AVI · MKV, up to 100 MB</p>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {!resultUrl && file && (
        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-card shadow-soft space-y-5">
          {showFormat && (
            <div>
              <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Output format</label>
              <div className="flex flex-wrap gap-2">
                {(['mp4', 'webm', 'mov', 'avi', 'mkv'] as ContainerFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-semibold uppercase transition-all',
                      format === f ? 'bg-primary text-white shadow-glow' : 'bg-surface text-text-muted hover:bg-primary-light',
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showCrf && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Compression</label>
                <span className="text-xs font-mono text-text-muted">CRF {crf}</span>
              </div>
              <input
                type="range" min={18} max={40} value={crf}
                onChange={(e) => setCrf(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="mt-1 text-[11px] text-text-subtle">Lower = better quality, larger file. 26–30 is a good balance.</p>
            </div>
          )}

          {showBitrate && (
            <div>
              <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Audio bitrate</label>
              <div className="flex flex-wrap gap-2">
                {(['128k', '192k', '320k'] as Bitrate[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBitrate(b)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-semibold uppercase transition-all',
                      bitrate === b ? 'bg-primary text-white shadow-glow' : 'bg-surface text-text-muted hover:bg-primary-light',
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showGifOpts && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Frame rate</label>
                <span className="text-xs font-mono text-text-muted">{fps} fps</span>
              </div>
              <input
                type="range" min={5} max={24} value={fps}
                onChange={(e) => setFps(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="mt-1 text-[11px] text-text-subtle">GIFs are capped at the first 10 seconds to keep file size reasonable.</p>
            </div>
          )}

          <Button onClick={process} loading={loading} className="w-full" size="lg">
            {loading ? 'Processing…' : <>Process video <Film className="w-4 h-4" /></>}
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
          <span className="text-sm">Processing your video… this can take a moment.</span>
        </div>
      )}

      {/* Result */}
      {resultUrl && !loading && (
        <div className="p-5 md:p-6 bg-white dark:bg-card border border-border rounded-2xl shadow-soft-lg">
          <div className="flex flex-col md:flex-row gap-5">
            {isGifResult ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resultUrl} alt={resultName} className="w-full md:w-52 max-h-52 object-contain rounded-2xl bg-surface" />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={resultUrl} controls className="w-full md:w-52 max-h-52 rounded-2xl bg-ink" />
            )}
            <div className="flex-1 min-w-0 flex flex-col">
              <h3 className="font-semibold text-text leading-snug truncate">{resultName}</h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-text-muted">Original: <span className="font-mono text-text">{formatBytes(origSize)}</span></span>
                <span className="text-text-muted">New: <span className="font-mono text-text">{formatBytes(outSize)}</span></span>
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
                <Button variant="outline" size="md" onClick={reset}>Process another</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
