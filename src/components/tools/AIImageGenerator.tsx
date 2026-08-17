'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, ImagePlus, Loader2, RefreshCw, Sparkles, WandSparkles } from 'lucide-react';

type GenerationStatus = 'idle' | 'validating' | 'generating' | 'completed' | 'failed' | 'insufficient_credits' | 'rate_limited' | 'unavailable';
type ImageResult = { url: string; revisedPrompt?: string; id: string };

type BalanceResponse = { ok: boolean; authenticated: boolean; credits?: number; creditCost?: number; highQualityMultiplier?: number; maxImagesPerRequest?: number; message?: string };

const ratioOptions = [
  { value: '1:1', label: 'Square', hint: '1:1' },
  { value: '16:9', label: 'Landscape', hint: '16:9' },
  { value: '9:16', label: 'Portrait', hint: '9:16' },
  { value: '4:3', label: 'Standard', hint: '4:3' },
  { value: '3:2', label: 'Classic', hint: '3:2' },
];

const qualityOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High quality' },
];

function statusCopy(status: GenerationStatus) {
  switch (status) {
    case 'validating': return 'Checking your request…';
    case 'generating': return 'Creating your image…';
    case 'insufficient_credits': return 'You do not have enough SavCredits for this request.';
    case 'rate_limited': return 'You have reached the current generation limit. Please try again later.';
    case 'unavailable': return 'AI generation is temporarily unavailable. Please try again later.';
    case 'failed': return 'The image could not be created. Reserved credits were released.';
    default: return '';
  }
}

export function AIImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('1:1');
  const [quality, setQuality] = useState('standard');
  const [count, setCount] = useState(1);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [images, setImages] = useState<ImageResult[]>([]);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [baseCost, setBaseCost] = useState(5);
  const [highMultiplier, setHighMultiplier] = useState(1.4);
  const [maxImages, setMaxImages] = useState(4);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/tools/ai-image-generator', { method: 'GET' })
      .then((response) => response.json() as Promise<BalanceResponse>)
      .then((data) => {
        setAuthenticated(data.authenticated);
        if (typeof data.credits === 'number') setBalance(data.credits);
        if (typeof data.creditCost === 'number') setBaseCost(data.creditCost);
        if (typeof data.highQualityMultiplier === 'number') setHighMultiplier(data.highQualityMultiplier);
        if (typeof data.maxImagesPerRequest === 'number') { setMaxImages(data.maxImagesPerRequest); setCount((current) => Math.min(current, data.maxImagesPerRequest!)); }
      })
      .catch(() => setAuthenticated(null));
  }, []);

  const estimatedCost = useMemo(() => Math.ceil(baseCost * count * (quality === 'high' ? highMultiplier : 1)), [baseCost, count, quality, highMultiplier]);
  const busy = status === 'validating' || status === 'generating';

  async function generate() {
    setError('');
    if (!prompt.trim()) { setStatus('failed'); setError('Describe the image you want to create before generating.'); return; }
    setStatus('validating');
    await new Promise((resolve) => setTimeout(resolve, 180));
    setStatus('generating');
    try {
      const response = await fetch('/api/tools/ai-image-generator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt.trim(), aspectRatio: ratio, quality, numberOfImages: count }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) { setAuthenticated(false); setStatus('failed'); setError('Sign in to use the AI Image Generator.'); }
        else if (response.status === 402) setStatus('insufficient_credits');
        else if (response.status === 429) setStatus('rate_limited');
        else if (response.status === 503) setStatus('unavailable');
        else { setStatus('failed'); setError(data.error || 'Something went wrong. Please try again.'); }
        return;
      }
      setImages(data.images || []);
      setBalance(typeof data.credits === 'number' ? data.credits : balance);
      setStatus('completed');
    } catch {
      setStatus('failed');
      setError('We could not reach the generator. Please check your connection and try again.');
    }
  }

  function resetForAnother() { setImages([]); setStatus('idle'); setError(''); }

  return (
    <div className="rounded-3xl border border-border bg-white p-5 shadow-soft-lg dark:bg-card sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold text-text">Create an image</h2></div><p className="mt-1 text-sm text-text-muted">Write a prompt, tune the output, and keep the result on this page.</p></div>
        <div className="rounded-xl border border-border bg-surface px-3 py-2 text-right"><p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">SavCredits</p><p className="mt-0.5 text-lg font-bold text-text">{balance === null ? '—' : balance}</p></div>
      </div>

      <label htmlFor="ai-image-prompt" className="mt-7 block text-sm font-semibold text-text">Describe the image you want to create</label>
      <textarea id="ai-image-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={1200} disabled={busy} placeholder="Describe the image you want to create…" className="mt-3 min-h-40 w-full resize-y rounded-2xl border border-border bg-surface px-4 py-4 text-base text-text outline-none transition placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-70" />
      <div className="mt-2 flex justify-end text-xs text-text-muted">{prompt.length}/1200</div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block"><span className="text-sm font-semibold text-text">Aspect ratio</span><select value={ratio} onChange={(event) => setRatio(event.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">{ratioOptions.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.hint}</option>)}</select></label>
        <label className="block"><span className="text-sm font-semibold text-text">Image size / quality</span><select value={quality} onChange={(event) => setQuality(event.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">{qualityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="block"><span className="text-sm font-semibold text-text">Number of images</span><select value={count} onChange={(event) => setCount(Number(event.target.value))} disabled={busy} className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">{[1, 2, 3, 4].map((value) => <option key={value} value={value} disabled={value > maxImages}>{value} {value === 1 ? 'image' : 'images'}{value > maxImages ? ' · Pro' : ''}</option>)}</select></label>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-text-muted">This request uses <strong className="text-text">{estimatedCost} SavCredits</strong>.</p><button type="button" onClick={generate} disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 font-semibold text-white shadow-glow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <WandSparkles className="h-5 w-5" />}{busy ? 'Creating your image…' : 'Generate Image'}<span className="rounded-lg bg-white/15 px-2 py-0.5 text-xs">{estimatedCost} credits</span></button></div>

      {status !== 'idle' && status !== 'completed' && (statusCopy(status) || error) && <div role="alert" className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${status === 'failed' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300' : 'border-primary/20 bg-primary/5 text-text'}`}><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">{error || statusCopy(status)}</p>{status === 'insufficient_credits' && <a href="/pricing" className="mt-1 inline-block font-semibold underline">View credit options</a>}{status === 'failed' && error.includes('Sign in') && <button type="button" onClick={() => window.location.assign(`/api/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`)} className="mt-2 font-semibold underline">Sign in</button>}</div></div>}

      {status === 'completed' && images.length > 0 && <div className="mt-8 border-t border-border pt-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-text">Your generated image{images.length > 1 ? 's' : ''}</h3><p className="mt-1 text-sm text-text-muted">Download a result or generate another variation.</p></div><button type="button" onClick={resetForAnother} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text transition hover:border-primary hover:text-primary"><RefreshCw className="h-4 w-4" /> Generate again</button></div><div className={`mt-5 grid gap-4 ${images.length > 1 ? 'sm:grid-cols-2' : ''}`}>{images.map((image) => <div key={image.id} className="overflow-hidden rounded-2xl border border-border bg-surface"><img src={image.url} alt={image.revisedPrompt || prompt} className="aspect-square w-full object-cover" /><div className="flex items-center justify-between gap-3 p-3"><span className="truncate text-xs text-text-muted">Generated image</span><a href={image.url} download={`savdown-ai-${image.id}.png`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"><Download className="h-3.5 w-3.5" /> Download</a></div></div>)}</div></div>}

      {authenticated === false && status === 'idle' && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-text-muted"><ImagePlus className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p><strong className="text-text">Sign in before generating.</strong> Your balance and generated images are kept with your SavDown account.</p></div>}
    </div>
  );
}
