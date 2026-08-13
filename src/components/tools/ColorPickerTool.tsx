'use client';
/**
 * Color Picker Tool, client-side only, uses the browser EyeDropper API
 * where available and falls back to a file-upload + canvas colour sampler.
 *
 * No backend required.
 */
import { useState, useRef, useCallback } from 'react';
import { Pipette, Copy, Check, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type ColorResult = {
  hex: string;
  rgb: string;
  hsl: string;
};

/** The EyeDropper API has no official TS lib types yet (Chrome/Edge 95+ only). */
type EyeDropperResult = { sRGBHex: string };
type EyeDropperConstructor = new () => { open: () => Promise<EyeDropperResult> };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): string {
  const nr = r / 255, ng = g / 255, nb = b / 255;
  const max = Math.max(nr, ng, nb), min = Math.min(nr, ng, nb);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case nr: h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6; break;
      case ng: h = ((nb - nr) / d + 2) / 6; break;
      case nb: h = ((nr - ng) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function buildResult(hex: string): ColorResult {
  const { r, g, b } = hexToRgb(hex);
  return { hex, rgb: `rgb(${r}, ${g}, ${b})`, hsl: rgbToHsl(r, g, b) };
}

export function ColorPickerTool() {
  const [color, setColor]           = useState<ColorResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied]         = useState<string | null>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const { success, error: errToast } = useToast();

  /* ── EyeDropper API ── */
  const pickFromScreen = useCallback(async () => {
    const EyeDropper = (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper;
    if (!EyeDropper) {
      errToast('Not supported', 'Your browser does not support the EyeDropper API. Try Chrome 95+ or Edge 95+.');
      return;
    }
    try {
      const dropper = new EyeDropper();
      const result  = await dropper.open();
      setColor(buildResult(result.sRGBHex));
      success('Color picked!', result.sRGBHex);
    } catch {
      // User cancelled, ignore
    }
  }, [errToast, success]);

  /* ── File upload → canvas sampler ── */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setColor(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top)  * scaleY);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex   = `#${pixel[0]!.toString(16).padStart(2, '0')}${pixel[1]!.toString(16).padStart(2, '0')}${pixel[2]!.toString(16).padStart(2, '0')}`;
    setColor(buildResult(hex));
  }, []);

  const copyValue = useCallback((val: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(val);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {hasEyeDropper && (
          <button
            onClick={pickFromScreen}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-brand text-white text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
          >
            <Pipette className="w-4 h-4" /> Pick from Screen
          </button>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-border bg-white text-sm font-semibold text-text hover:border-primary/40 transition-colors"
        >
          <Upload className="w-4 h-4" /> Pick from Image
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Image canvas */}
      {previewUrl && (
        <div className="relative rounded-2xl overflow-hidden border border-border shadow-soft">
          <button
            onClick={() => { setPreviewUrl(null); setColor(null); if (fileRef.current) fileRef.current.value = ''; }}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-soft hover:bg-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="absolute top-3 left-3 text-xs bg-black/60 text-white px-2.5 py-1 rounded-full">
            Click anywhere to pick a colour
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Pick a colour"
            className="hidden"
            onLoad={(e) => {
              const img    = e.currentTarget;
              const canvas = canvasRef.current;
              if (!canvas) return;
              canvas.width  = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0);
            }}
          />
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full cursor-crosshair max-h-80 object-contain"
          />
        </div>
      )}

      {/* Result */}
      {color && (
        <div className="p-6 rounded-2xl border border-border bg-white shadow-soft">
          <div className="flex items-center gap-5 mb-5">
            <div
              className="w-20 h-20 rounded-2xl border border-border shadow-soft shrink-0"
              style={{ background: color.hex }}
            />
            <div>
              <p className="text-lg font-bold text-text">{color.hex.toUpperCase()}</p>
              <p className="text-sm text-text-muted mt-0.5">{color.rgb}</p>
              <p className="text-sm text-text-muted">{color.hsl}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { label: 'HEX', value: color.hex.toUpperCase() },
              { label: 'RGB', value: color.rgb },
              { label: 'HSL', value: color.hsl },
            ].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => copyValue(value)}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface hover:bg-primary-light/40 border border-border transition-colors text-left"
              >
                <div>
                  <p className="text-xs font-semibold text-text-subtle uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-mono text-text mt-0.5">{value}</p>
                </div>
                {copied === value
                  ? <Check className="w-4 h-4 text-accent shrink-0" />
                  : <Copy  className="w-4 h-4 text-text-muted shrink-0" />
                }
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
