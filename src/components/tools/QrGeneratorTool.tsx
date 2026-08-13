'use client';
/**
 * QrGeneratorTool, client UI for the qrcode library.
 *
 * Architecture: Frontend → /api/tools/qr/generate → qrcode (node)
 *
 * The server renders PNG / SVG / base64; we display a live preview and offer
 * download in the chosen format.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Download, AlertCircle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { FunctionalToolProps } from '@/config/functionalTools';

type Fmt = 'png' | 'svg' | 'base64';
type Ec = 'L' | 'M' | 'Q' | 'H';

export function QrGeneratorTool(_props: FunctionalToolProps) {
  const { success, error: errToast } = useToast();

  const [text, setText]       = useState('https://savdown.com');
  const [format, setFormat]   = useState<Fmt>('png');
  const [size, setSize]       = useState(400);
  const [margin, setMargin]   = useState(4);
  const [color, setColor]     = useState('#0F0B1E');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [ec, setEc]           = useState<Ec>('M');

  const [preview, setPreview] = useState<string | null>(null);  // data URL or raw svg
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const reqId = useRef(0);

  /* Live generate on any input change (debounced via requestId guard). */
  const generate = useCallback(async () => {
    if (!text.trim()) {
      setPreview(null);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tools/qr/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text, format: 'base64', size, margin, color, bgColor, ecLevel: ec,
        }),
      });

      if (id !== reqId.current) return; // a newer request superseded this one

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { error?: string }).error || `Request failed (${res.status}).`;
        setError(msg);
        setPreview(null);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as { ok?: boolean; dataUrl?: string };
      if (id !== reqId.current) return;
      setPreview(data.dataUrl || null);
    } catch {
      if (id !== reqId.current) return;
      setError('Network error. Please try again.');
      setPreview(null);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [text, size, margin, color, bgColor, ec]);

  useEffect(() => {
    const t = setTimeout(() => { void generate(); }, 250);
    return () => clearTimeout(t);
  }, [generate]);

  /* Download in the user's chosen format. */
  const download = useCallback(async () => {
    if (!text.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/tools/qr/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, format, size, margin, color, bgColor, ecLevel: ec }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || `Request failed (${res.status}).`);
        errToast('Download failed', 'Could not generate the file.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const ext = format === 'svg' ? 'svg' : 'png';
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      success('Downloaded', `qrcode.${ext} saved.`);
    } catch {
      setError('Network error. Please try again.');
    }
  }, [text, format, size, margin, color, bgColor, ec, success, errToast]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        {/* Controls */}
        <div className="p-5 rounded-2xl border border-border bg-white shadow-soft space-y-4 md:order-1 order-2">
          <div>
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Content</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="URL, text, email, phone…"
              className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Download format</label>
            <div className="flex gap-2">
              {(['png', 'svg', 'base64'] as Fmt[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-semibold uppercase transition-all',
                    format === f ? 'bg-primary text-white shadow-glow' : 'bg-surface text-text-muted hover:bg-primary-light/40',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Size</label>
              <span className="text-xs font-mono text-text-muted">{size}px</span>
            </div>
            <input type="range" min={128} max={1024} step={32} value={size}
              onChange={(e) => setSize(parseInt(e.target.value))} className="w-full accent-primary" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Margin</label>
              <span className="text-xs font-mono text-text-muted">{margin}</span>
            </div>
            <input type="range" min={0} max={10} value={margin}
              onChange={(e) => setMargin(parseInt(e.target.value))} className="w-full accent-primary" />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Error correction</label>
            <div className="flex gap-2">
              {(['L', 'M', 'Q', 'H'] as Ec[]).map((e) => (
                <button
                  key={e}
                  onClick={() => setEc(e)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-semibold transition-all',
                    ec === e ? 'bg-primary text-white shadow-glow' : 'bg-surface text-text-muted hover:bg-primary-light/40',
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Foreground</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 rounded-xl border border-border cursor-pointer p-0.5 bg-surface" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Background</label>
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                className="w-full h-10 rounded-xl border border-border cursor-pointer p-0.5 bg-surface" />
            </div>
          </div>

          <Button onClick={download} disabled={!text.trim()} className="w-full" size="lg">
            <Download className="w-4 h-4" /> Download {format.toUpperCase()}
          </Button>
        </div>

        {/* Live preview */}
        <div className="p-5 rounded-2xl border border-border bg-white shadow-soft flex flex-col items-center justify-center min-h-[280px] md:order-2 order-1">
          {loading && !preview ? (
            <div className="flex flex-col items-center gap-3 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm">Generating…</span>
            </div>
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="QR code preview" className="max-w-full max-h-72 rounded-xl" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-text-subtle">
              <QrCode className="w-10 h-10" />
              <span className="text-sm">Enter content to preview</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
