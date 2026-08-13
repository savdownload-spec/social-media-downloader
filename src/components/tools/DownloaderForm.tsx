'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2, AlertCircle, Play, Check } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { useToast } from '@/components/ui/Toast';
import type { DownloadResult, DownloadFormat } from '@/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Downloads a file with visible progress instead of a plain <a href download>
 * (which gives no feedback while the server is still generating the file,
 * common for on-demand muxed/converted downloads that take several seconds
 * before any bytes are ready). Streams the response, tracks bytes received
 * against Content-Length when available, then saves via a Blob.
 */
async function downloadWithProgress(
  url: string,
  fallbackFilename: string,
  onProgress: (pct: number | null, receivedBytes: number) => void,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Download failed.');
  }

  const disposition = res.headers.get('content-disposition') || '';
  const nameMatch = disposition.match(/filename="([^"]+)"/);
  const filename = nameMatch?.[1] || fallbackFilename;

  const total = parseInt(res.headers.get('content-length') || '0', 10);
  const reader = res.body?.getReader();

  const chunks: Uint8Array[] = [];
  let received = 0;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        onProgress(total > 0 ? Math.min(99, Math.round((received / total) * 100)) : null, received);
      }
    }
  } else {
    // Streaming reader unavailable, fall back to a single buffered read.
    const buf = await res.arrayBuffer();
    chunks.push(new Uint8Array(buf));
    received = buf.byteLength;
  }

  onProgress(100, received);

  const blob = new Blob(chunks as BlobPart[]);
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/**
 * A serializable subset of a Tool. The full Tool contains a RegExp
 * (`urlPattern`), which cannot cross the Server→Client boundary, so callers
 * pass the pattern's source string instead and we rebuild it here.
 */
export type ClientTool = {
  slug: string;
  platform: string;
  name: string;
  placeholder: string;
  urlPattern: string;
};

export function DownloaderForm({ tool }: { tool: ClientTool }) {
  const params = useSearchParams();
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Extract<DownloadResult, { ok: true }> | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const { success, error: errorToast, warning } = useToast();

  const handleDownload = useCallback(async (f: DownloadFormat) => {
    const key = f.label + f.quality;
    setDownloadingKey(key);
    setDownloadPct(0);
    setDownloadedBytes(0);
    try {
      await downloadWithProgress(f.url, `${tool.name}.${f.extension}`, (pct, bytes) => {
        setDownloadPct(pct);
        setDownloadedBytes(bytes);
      });
    } catch (e) {
      errorToast('Download failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setDownloadingKey(null);
      setDownloadPct(null);
    }
  }, [tool.name, errorToast]);

  useEffect(() => {
    const q = params.get('url');
    if (q) {
      setUrl(q);
      void submit(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(async (input?: string) => {
    const target = (input ?? url).trim();
    if (!target) {
      setError('Paste a link to get started.');
      setState('error');
      return;
    }
    if (!new RegExp(tool.urlPattern, 'i').test(target)) {
      setError(`That doesn't look like a valid ${tool.platform} URL.`);
      setState('error');
      return;
    }

    setError('');
    setState('loading');
    setResult(null);

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: target, tool: tool.slug }),
      });

      const data: DownloadResult = await res.json();

      if (!res.ok || !data.ok) {
        const message = data.ok ? 'Something went wrong.' : data.error;
        setError(message);
        setState('error');

        // Toast for rate-limited or network-level errors
        if (res.status === 429) {
          warning('Slow down!', 'Too many requests, please wait a moment before trying again.');
        } else {
          errorToast('Download failed', message);
        }
        return;
      }

      setResult(data);
      setState('done');
      success('Download ready', `${tool.name} media analyzed successfully.`);
    } catch {
      setError('Network error. Please try again.');
      setState('error');
      errorToast('Network error', 'Could not reach the server. Check your connection and try again.');
    }
  }, [url, tool, success, errorToast, warning]);

  return (
    <div className="w-full">
      <div className="gradient-ring rounded-[26px] shadow-soft-xl">
        <div className="p-2 bg-white rounded-[25px] flex flex-col sm:flex-row gap-3">
          <Input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={tool.placeholder}
            className="border-0 shadow-none focus:shadow-none focus:border-0 px-4 text-base"
            aria-label={`${tool.name} URL`}
          />
          <Button size="lg" onClick={() => submit()} loading={state === 'loading'} className="shrink-0">
            {state === 'loading' ? 'Fetching…' : <>Download <Download className="w-4 h-4" /></>}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && state === 'error' && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {state === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-6 bg-white border border-border rounded-2xl shadow-soft flex items-center gap-3 text-text-muted"
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">Analyzing your link…</span>
          </motion.div>
        )}

        {result && state === 'done' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-5 md:p-6 bg-white border border-border rounded-2xl shadow-soft-lg"
          >
            <div className="flex flex-col md:flex-row gap-5">
              {result.thumbnail && (
                <div className="relative w-full md:w-52 aspect-video rounded-2xl overflow-hidden bg-surface flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-4 h-4 text-text ml-0.5" />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text leading-snug line-clamp-2">
                  {result.title}
                </h3>
                {result.author && (
                  <p className="mt-1 text-sm text-text-muted">by {result.author}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.formats.map((f) => {
                    const key = f.label + f.quality;
                    const isDownloading = downloadingKey === key;
                    const isOtherDownloading = downloadingKey !== null && !isDownloading;
                    const isDone = isDownloading && downloadPct === 100;
                    return (
                      <button
                        key={key}
                        onClick={() => handleDownload(f)}
                        disabled={isOtherDownloading}
                        className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-text text-white text-sm font-medium hover:bg-text/90 active:scale-[0.98] transition-all overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isDownloading && (
                          <span
                            className="absolute inset-y-0 left-0 bg-primary/50 transition-[width] duration-200"
                            style={{
                              width: downloadPct !== null ? `${downloadPct}%` : '100%',
                              ...(downloadPct === null ? { animation: 'pulse 1.4s ease-in-out infinite' } : {}),
                            }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                          {isDownloading ? (
                            isDone ? <Check className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          {isDownloading
                            ? (downloadPct !== null ? `${downloadPct}%` : `${formatBytes(downloadedBytes)}…`)
                            : f.label}
                          {!isDownloading && f.size && <span className="text-white/60 text-xs">· {f.size}</span>}
                        </span>
                      </button>
                    );
                  })}
                  {result.formats.length > 0 && (
                    <CopyButton
                      value={result.formats[0].url}
                      variant="outline"
                      size="sm"
                      successMessage="Link copied!"
                      successDescription="You can now paste it anywhere."
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
