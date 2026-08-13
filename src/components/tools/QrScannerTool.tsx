'use client';
/**
 * QrScannerTool, client UI for decoding a QR code from an uploaded image.
 *
 * Architecture: Frontend → /api/tools/qr/scan → jsqr + Sharp
 */
import { useCallback, useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle, ScanLine, X, Copy, Check, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { FunctionalToolProps } from '@/config/functionalTools';

const MAX_BYTES = 10 * 1024 * 1024;

export function QrScannerTool(_props: FunctionalToolProps) {
  const { success, error: errToast } = useToast();
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [data, setData]       = useState<string | null>(null);
  const [type, setType]       = useState<string>('');
  const [copied, setCopied]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setData(null);
    setType('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleFile = useCallback((f: File | null) => {
    setError('');
    setData(null);
    if (!f) { setFile(null); setPreview(null); return; }
    if (f.size > MAX_BYTES) {
      setError('File too large. Maximum size is 10 MB.');
      errToast('File too large', 'Maximum image size is 10 MB.');
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

  const scan = useCallback(async () => {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/tools/qr/scan', { method: 'POST', body: fd });
      const result = await res.json().catch(() => ({})) as { ok?: boolean; data?: string; type?: string; error?: string };

      if (!res.ok || !result.ok) {
        const msg = result.error || `Scan failed (${res.status}).`;
        setError(msg);
        errToast('No QR found', msg);
        setLoading(false);
        return;
      }

      setData(result.data || '');
      setType(result.type || 'Text');
      success('QR decoded', `${result.type || 'Text'} found.`);
    } catch {
      setError('Network error. Please try again.');
      errToast('Network error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [file, success, errToast]);

  const copy = useCallback(() => {
    if (!data) return;
    navigator.clipboard.writeText(data).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      success('Copied', 'Decoded text copied to clipboard.');
    });
  }, [data, success]);

  const isUrl = data ? /^https?:\/\//i.test(data) : false;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Dropzone / preview */}
      {!data && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-200 p-8 text-center',
            preview ? 'border-primary/40 bg-white' : 'border-border bg-white hover:border-primary/40 hover:bg-primary-light/20',
          )}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />

          {preview ? (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white shadow-soft-md flex items-center justify-center hover:bg-surface"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={file?.name || 'preview'} className="max-h-72 mx-auto rounded-2xl object-contain" />
              <p className="mt-3 text-xs text-text-muted truncate">{file?.name}</p>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center gap-3">
              <span className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </span>
              <p className="font-semibold text-text">Drop a QR image here, or click to browse</p>
              <p className="text-xs text-text-subtle">JPG · PNG · WEBP · GIF, up to 10 MB</p>
            </div>
          )}
        </div>
      )}

      {/* Scan button */}
      {!data && file && (
        <button
          onClick={scan}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
          {loading ? 'Scanning…' : 'Scan QR code'}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Result */}
      {data && !loading && (
        <div className="p-5 md:p-6 bg-white border border-border rounded-2xl shadow-soft-lg">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2.5 py-1 rounded-full bg-accent-light text-xs font-semibold text-accent-hover">{type}</span>
            <h3 className="font-semibold text-text">Decoded content</h3>
          </div>

          <div className="p-4 rounded-xl bg-surface font-mono text-sm text-text break-all whitespace-pre-wrap max-h-60 overflow-auto">
            {data}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={copy}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90',
                copied ? 'bg-accent' : 'bg-gradient-brand shadow-glow',
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {isUrl && (
              <a
                href={data} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-text bg-white border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open link
              </a>
            )}
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-text bg-white border border-border hover:border-primary/40 transition-colors"
            >
              Scan another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
