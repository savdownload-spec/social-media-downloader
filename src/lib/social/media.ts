export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export type MediaKind = 'IMAGE' | 'VIDEO';

export function mediaKindFromMime(mimeType: string): MediaKind | null {
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) return 'IMAGE';
  if ((VIDEO_MIME_TYPES as readonly string[]).includes(mimeType)) return 'VIDEO';
  return null;
}

export function isVercelBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

/** Static token or Vercel OIDC (BLOB_STORE_ID + VERCEL_OIDC_TOKEN). */
export function isBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function isLocalSocialUrl(url: string): boolean {
  return url.startsWith('/social/uploads/');
}

export function safeFileName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'asset';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function socialBlobPrefix(now = new Date()): string {
  return `social/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
}
