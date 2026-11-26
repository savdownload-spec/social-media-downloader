'use client';

import { apiGet, apiSend } from './api';
import type { SerializedAsset } from '@/lib/social/serialize';
import { mediaKindFromMime } from '@/lib/social/media';
import { IMAGE_MIME_TYPES, VIDEO_MIME_TYPES } from '@/lib/social/media';

type MediaConfig = {
  mode: 'blob' | 'local' | 'unavailable';
  maxBytes: number;
};

async function imageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return {};
  }
}

async function videoMetadata(file: File): Promise<{
  width?: number;
  height?: number;
  durationSeconds?: number;
}> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const finish = (value: { width?: number; height?: number; durationSeconds?: number }) => {
      URL.revokeObjectURL(url);
      video.remove();
      resolve(value);
    };
    const timer = window.setTimeout(() => finish({}), 8_000);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      finish({
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : undefined,
      });
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish({});
    };
    video.src = url;
  });
}

function safeName(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'asset'
  );
}

function uploadPath(file: File): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `social/${now.getFullYear()}/${month}/${id}-${safeName(file.name.replace(/\.[^.]+$/, ''))}`;
}

/** Uploads one file and returns the registered asset. */
export async function uploadSocialFile(file: File): Promise<SerializedAsset> {
  const kind = mediaKindFromMime(file.type);
  if (!kind) throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
  const config = await apiGet<MediaConfig>('/api/admin/social/media/config');
  if (file.size > config.maxBytes) throw new Error('File exceeds the upload limit.');

  const extra = kind === 'IMAGE' ? await imageDimensions(file) : await videoMetadata(file);

  if (config.mode === 'blob') {
    const { upload } = await import('@vercel/blob/client');
    const pathname = uploadPath(file);
    const blob = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/admin/social/media/client-upload',
      contentType: file.type,
    });
    const result = await apiSend<{ asset: SerializedAsset }>('/api/admin/social/media', 'POST', {
      url: blob.url,
      pathname: blob.pathname ?? pathname,
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      kind,
      provider: 'BLOB',
      ...extra,
    });
    return result.asset;
  }

  if (config.mode === 'local') {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/admin/social/media/local-upload', {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    });
    const json = (await response.json().catch(() => null)) as
      | { ok: boolean; data?: { asset: SerializedAsset }; error?: string }
      | null;
    if (!response.ok || !json?.ok || !json.data) {
      throw new Error(json?.error || 'Upload failed.');
    }
    return json.data.asset;
  }

  throw new Error('Media storage is not configured for this deployment.');
}

export const ACCEPTED_UPLOADS = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES].join(',');
