import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requestBinary } from '../http';
import type { PublishAsset, PublishContext, PublishOutcome } from './index';

/** Caption for one variant, falling back to the master caption. */
export function variantText(context: PublishContext): string {
  const caption = context.variant.caption?.trim() || context.post.caption?.trim() || '';
  const hashtags = (context.variant.hashtags ?? context.post.hashtags ?? '').trim();
  const link = (context.variant.linkUrl ?? context.post.linkUrl ?? '').trim();
  return [caption, hashtags, link].filter(Boolean).join('\n\n');
}

export function variantTitle(context: PublishContext): string {
  return (context.variant.title ?? context.post.title ?? '').trim();
}

export function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1))}…`;
}

export function optionValue(context: PublishContext, key: string): string | null {
  const options = (context.variant.options as Record<string, unknown> | null) ?? {};
  const value = options[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function absoluteUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** Public providers must be able to fetch the media themselves. */
export function publicMediaUrl(asset: PublishAsset): string | null {
  const url = absoluteUrl(asset.url);
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return null;
  } catch {
    return null;
  }
  return url;
}

const LOCAL_PREFIX = '/social/uploads/';

export async function assetBytes(asset: PublishAsset): Promise<{ buffer: Buffer; contentType: string }> {
  if (asset.url.startsWith(LOCAL_PREFIX)) {
    const root = path.resolve(process.cwd(), 'public');
    const target = path.resolve(root, `.${asset.url}`);
    if (!target.startsWith(root + path.sep)) throw new Error('Invalid local media path.');
    return { buffer: await readFile(target), contentType: asset.mimeType };
  }
  return requestBinary(asset.url);
}

export function needsAuth(message: string): PublishOutcome {
  return { outcome: 'NEEDS_AUTH', code: 'RECONNECT_REQUIRED', message };
}

export function failed(message: string, code?: string): PublishOutcome {
  return { outcome: 'FAILED', code, message };
}

export function imageAssets(context: PublishContext): PublishAsset[] {
  return context.assets.filter((asset) => asset.kind === 'IMAGE');
}

export function videoAssets(context: PublishContext): PublishAsset[] {
  return context.assets.filter((asset) => asset.kind === 'VIDEO');
}
