'use client';

import { useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { ProcessingProgress } from '@/components/tools/ProcessingProgress';
import { cn } from '@/lib/utils';

export function ImageUploadZone({
  file,
  previewUrl,
  accept,
  hint,
  disabled = false,
  onSelect,
  onClear,
}: {
  file: File | null;
  previewUrl: string | null;
  accept: string;
  hint: string;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const open = () => { if (!disabled) inputRef.current?.click(); };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={file ? `Replace ${file.name}` : 'Upload an image'}
      aria-disabled={disabled}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
      }}
      onClick={open}
      onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const selected = event.dataTransfer.files[0];
        if (selected && !disabled) onSelect(selected);
      }}
      className={cn(
        'relative rounded-3xl border-2 border-dashed bg-white p-8 text-center transition-all dark:bg-card',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/50 hover:bg-primary-light/40',
        dragging ? 'border-primary bg-primary-light/60' : 'border-border',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) onSelect(selected);
          event.target.value = '';
        }}
      />
      {previewUrl ? (
        <div className="relative">
          {onClear && !disabled && (
            <button
              type="button"
              aria-label="Remove Image"
              onClick={(event) => { event.stopPropagation(); onClear(); }}
              className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-text shadow-soft-md hover:bg-surface dark:bg-card"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={file?.name ?? 'Image preview'} className="mx-auto max-h-64 rounded-2xl object-contain" />
          <p className="mt-3 truncate text-xs text-text-muted">{file?.name}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
            <Upload className="h-6 w-6 text-primary" />
          </span>
          <p className="font-semibold text-text">Drop an image here, or click to browse</p>
          <p className="text-xs text-text-subtle">{hint}</p>
        </div>
      )}
    </div>
  );
}

export function ImageToolError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function ImageToolProgress({ children }: { children: ReactNode }) {
  return <ProcessingProgress stage={String(children)} />;
}

export async function imageApiError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({})) as { error?: string; retryAfter?: number };
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After') ?? data.retryAfter ?? 0);
    return data.error ?? (retryAfter > 0 ? `Too many requests. Try again in ${retryAfter} seconds.` : 'Too many requests. Please try again shortly.');
  }
  return data.error ?? fallback;
}
