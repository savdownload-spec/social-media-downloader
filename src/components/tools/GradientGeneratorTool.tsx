'use client';
/**
 * Gradient Generator Tool, 100% client-side.
 * Generates CSS linear/radial/conic gradients with full customisation.
 * No backend required.
 */
import { useState, useCallback } from 'react';
import { Plus, Trash2, Copy, Check, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type Stop = { color: string; position: number };
type GradientType = 'linear' | 'radial' | 'conic';

const PRESETS: { name: string; stops: Stop[]; type: GradientType; angle: number }[] = [
  { name: 'Sunset',   type: 'linear', angle: 135, stops: [{ color: '#f97316', position: 0 }, { color: '#ec4899', position: 50 }, { color: '#8b5cf6', position: 100 }] },
  { name: 'Ocean',    type: 'linear', angle: 180, stops: [{ color: '#0ea5e9', position: 0 }, { color: '#6366f1', position: 100 }] },
  { name: 'Forest',   type: 'linear', angle: 120, stops: [{ color: '#22c55e', position: 0 }, { color: '#14b8a6', position: 100 }] },
  { name: 'Rose',     type: 'radial', angle: 0,   stops: [{ color: '#fda4af', position: 0 }, { color: '#be123c', position: 100 }] },
  { name: 'Midnight', type: 'linear', angle: 225, stops: [{ color: '#1e1b4b', position: 0 }, { color: '#312e81', position: 50 }, { color: '#4f46e5', position: 100 }] },
  { name: 'Peach',    type: 'linear', angle: 90,  stops: [{ color: '#fde68a', position: 0 }, { color: '#fca5a5', position: 100 }] },
];

function buildCss(stops: Stop[], type: GradientType, angle: number): string {
  const stopStr = stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${s.position}%`)
    .join(', ');
  if (type === 'radial') return `radial-gradient(circle, ${stopStr})`;
  if (type === 'conic')  return `conic-gradient(from ${angle}deg, ${stopStr})`;
  return `linear-gradient(${angle}deg, ${stopStr})`;
}

function randomHex(): string {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

export function GradientGeneratorTool() {
  const [type,   setType]   = useState<GradientType>('linear');
  const [angle,  setAngle]  = useState(135);
  const [stops,  setStops]  = useState<Stop[]>([
    { color: '#6366f1', position: 0 },
    { color: '#ec4899', position: 100 },
  ]);
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  const css    = buildCss(stops, type, angle);
  const cssVar = `background: ${css};`;

  const copy = useCallback(() => {
    navigator.clipboard.writeText(cssVar).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      success('Copied!', 'CSS gradient copied to clipboard.');
    });
  }, [cssVar, success]);

  const addStop = () => {
    setStops((prev) => [
      ...prev,
      { color: randomHex(), position: Math.round((prev[prev.length - 1]!.position + 100) / 2) },
    ]);
  };

  const removeStop = (i: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateStop = (i: number, partial: Partial<Stop>) => {
    setStops((prev) => prev.map((s, idx) => idx === i ? { ...s, ...partial } : s));
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setType(preset.type);
    setAngle(preset.angle);
    setStops(preset.stops);
  };

  const randomise = () => {
    const count = 2 + Math.floor(Math.random() * 3);
    const newStops: Stop[] = Array.from({ length: count }, (_, i) => ({
      color:    randomHex(),
      position: Math.round((i / (count - 1)) * 100),
    }));
    setStops(newStops);
    setAngle(Math.floor(Math.random() * 360));
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Preview */}
      <div
        className="w-full h-48 rounded-2xl border border-border shadow-soft-lg transition-all duration-300"
        style={{ background: css }}
      />

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => applyPreset(p)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-white hover:border-primary/40 hover:text-primary text-text-muted transition-all"
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={randomise}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-white hover:border-primary/40 hover:text-primary text-text-muted transition-all"
        >
          <RefreshCw className="w-3 h-3" /> Random
        </button>
      </div>

      {/* Controls */}
      <div className="p-5 rounded-2xl border border-border bg-white shadow-soft space-y-5">
        {/* Type + angle */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">Type</label>
            <div className="flex gap-1">
              {(['linear', 'radial', 'conic'] as GradientType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                    type === t
                      ? 'bg-primary text-white shadow-glow'
                      : 'bg-surface text-text-muted hover:text-text hover:bg-primary-light/40'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {type !== 'radial' && (
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5 block">
                Angle: {angle}°
              </label>
              <input
                type="range" min={0} max={360} value={angle}
                onChange={(e) => setAngle(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}
        </div>

        {/* Colour stops */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Colour Stops</label>
            <button onClick={addStop} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              <Plus className="w-3.5 h-3.5" /> Add stop
            </button>
          </div>
          <div className="space-y-2">
            {stops.map((stop, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => updateStop(i, { color: e.target.value })}
                  className="w-10 h-10 rounded-xl border-0 cursor-pointer p-0.5 bg-surface"
                />
                <div className="flex-1">
                  <input
                    type="range" min={0} max={100} value={stop.position}
                    onChange={(e) => updateStop(i, { position: parseInt(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
                <span className="text-xs font-mono text-text-muted w-8 text-right">{stop.position}%</span>
                <button
                  onClick={() => removeStop(i)}
                  disabled={stops.length <= 2}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="p-4 rounded-2xl border border-border bg-[#1e1e2e] font-mono text-sm">
        <div className="flex items-start justify-between gap-3">
          <pre className="text-[#cdd6f4] flex-1 whitespace-pre-wrap break-all text-xs leading-relaxed">
            <span className="text-[#89b4fa]">background</span>
            <span className="text-[#cdd6f4]">: </span>
            <span className="text-[#a6e3a1]">{css}</span>
            <span className="text-[#cdd6f4]">;</span>
          </pre>
          <button
            onClick={copy}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              copied
                ? 'bg-accent text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy CSS'}
          </button>
        </div>
      </div>
    </div>
  );
}
