'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';

const MAX_BYTES = 8 * 1024 * 1024;

export function AuthorImageField({
  value,
  name,
  onChange,
  error,
}: {
  value: string | null;
  name: string;
  onChange: (url: string | null) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const upload = async (file: File) => {
    setUploadError('');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setUploadError('Use a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError('Image is larger than 8 MB.');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/admin/content/media?purpose=author', { method: 'POST', body });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Upload failed.');
      onChange(data.data.url);
    } catch (uploadFailure) {
      setUploadError(uploadFailure instanceof Error ? uploadFailure.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-2 block text-xs font-medium text-text-muted">Profile picture</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface">
          {value ? (
            // Preview can be a just-uploaded local path or a managed blob URL;
            // a plain img avoids the optimizer for arbitrary admin URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`${name || 'Author'} profile preview`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-text-subtle">
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
              <span className="text-[10px] font-medium">No image</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-light bg-white px-3 text-[12px] font-medium text-text transition-colors hover:bg-surface disabled:opacity-50"
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              {value ? 'Replace image' : 'Upload image'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={uploading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Remove
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-text-subtle">
            JPG, PNG, WebP, or GIF, up to 8 MB. Images are cropped to a square automatically in list views.
          </p>
          {(uploadError || error) && <p className="mt-1 text-[11px] font-medium text-rose-600">{uploadError || error}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-label="Upload profile picture"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
