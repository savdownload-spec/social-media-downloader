'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Link2, Search, Upload, CheckCircle2 } from 'lucide-react';
import { tools } from '@/config/tools';
import { catalog, isToolAvailable } from '@/config/catalog';
import { cn } from '@/lib/utils';
import { FOCUS_UNIVERSAL_INPUT_EVENT } from './WorkspaceMobileNav';

const UPLOAD_ROUTE_BY_PREFIX: { test: (type: string) => boolean; label: string; href: string }[] = [
  { test: (t) => t.startsWith('image/'), label: 'image tools', href: '/tools#image' },
  { test: (t) => t.startsWith('video/'), label: 'video tools', href: '/tools#video' },
  { test: (t) => t.startsWith('audio/'), label: 'audio tools', href: '/tools#video' },
  { test: (t) => t === 'application/pdf', label: 'PDF tools', href: '/tools#pdf' },
];

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim()) || /^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(value.trim());
}

export function UniversalInput() {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onFocusRequest() {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    window.addEventListener(FOCUS_UNIVERSAL_INPUT_EVENT, onFocusRequest);
    return () => window.removeEventListener(FOCUS_UNIVERSAL_INPUT_EVENT, onFocusRequest);
  }, []);

  const detectedTool = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed || !looksLikeUrl(trimmed)) return null;
    return tools.find((t) => t.urlPattern.test(trimmed)) ?? null;
  }, [value]);

  const searchMatches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q || looksLikeUrl(q)) return [];
    return catalog
      .filter((t) => isToolAvailable(t.slug))
      .filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      .slice(0, 5);
  }, [value]);

  const [uploadHint, setUploadHint] = useState<{ label: string; href: string } | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const match = UPLOAD_ROUTE_BY_PREFIX.find((r) => r.test(file.type));
    setUploadHint(match ? { label: match.label, href: match.href } : { label: 'all tools', href: '/tools' });
  }

  function handleGo() {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (detectedTool) {
      router.push(`/tools/${detectedTool.slug}?url=${encodeURIComponent(trimmed)}`);
      return;
    }
    if (searchMatches[0]) {
      router.push(`/tools/${searchMatches[0].slug}`);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative rounded-3xl border border-border bg-white dark:bg-card shadow-soft-lg p-2 flex flex-col sm:flex-row items-stretch gap-2">
        <div className="flex-1 flex items-center gap-2.5 px-3.5">
          <Link2 className="w-4 h-4 text-text-subtle shrink-0" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setUploadHint(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
            placeholder="Paste a link, upload a file, or search for a tool…"
            className="flex-1 h-12 bg-transparent outline-none text-[15px] text-text placeholder:text-text-subtle"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-11 px-3.5 rounded-2xl text-text-muted hover:text-text hover:bg-surface transition-colors inline-flex items-center gap-1.5 text-sm font-medium"
            title="Upload a file"
          >
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Upload</span>
          </button>
          <button
            type="button"
            onClick={handleGo}
            className="h-11 px-5 rounded-2xl text-white bg-gradient-brand bg-[length:200%_200%] hover:bg-[position:100%_50%] shadow-glow-lg transition-all inline-flex items-center gap-1.5 text-sm font-semibold active:scale-[0.98]"
          >
            Go <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detection result */}
      {detectedTool && (
        <div className="mt-3 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-primary-light border border-primary/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-text truncate">
              Detected: <span className="font-semibold">{detectedTool.name}</span>
            </p>
          </div>
          <Link
            href={`/tools/${detectedTool.slug}?url=${encodeURIComponent(value.trim())}`}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors"
          >
            Open Downloader <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Search fallback */}
      {!detectedTool && searchMatches.length > 0 && (
        <div className="mt-3 rounded-2xl border border-border bg-white dark:bg-card shadow-soft overflow-hidden">
          {searchMatches.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors border-b border-border-light last:border-0"
              >
                <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', t.tile)}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text truncate">{t.name}</span>
                  <span className="block text-xs text-text-muted truncate">{t.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Upload routing hint */}
      {uploadHint && (
        <div className="mt-3 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-surface border border-border-light">
          <p className="text-sm text-text-muted flex items-center gap-2">
            <Search className="w-4 h-4 text-text-subtle" />
            That file works best with our {uploadHint.label}.
          </p>
          <Link
            href={uploadHint.href}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-text text-white dark:bg-primary text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Browse <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
