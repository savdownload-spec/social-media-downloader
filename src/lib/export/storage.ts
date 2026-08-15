import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import path from 'path';
import { put, del } from '@vercel/blob';

const LOCAL_EXPORT_DIR = path.join(process.cwd(), '.export-cache');

/**
 * Persists a generated export file. Same guarded pattern as
 * src/app/api/admin/content/media/route.ts: Vercel Blob when configured
 * (required in production — serverless has no persistent filesystem),
 * otherwise a local cache directory for dev. Exports contain user PII, so
 * unlike blog media this is never written under `public/` and is only ever
 * served back out through the authenticated download route, never as a
 * bare public URL.
 */
export async function storeExportFile(jobId: string, fileName: string, buffer: Buffer): Promise<{ url: string; size: number }> {
  const onVercel = !!process.env.VERCEL;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`exports/${jobId}/${fileName}`, buffer, {
      access: 'public',
      contentType: 'application/octet-stream',
      addRandomSuffix: true,
    });
    return { url: blob.url, size: buffer.length };
  }
  if (onVercel) {
    throw new Error(
      "Export storage is not configured for this deployment. Add BLOB_READ_WRITE_TOKEN to this project's Production environment variables (Vercel → Storage → your Blob store → connect it to Production), then redeploy.",
    );
  }

  const dir = path.join(LOCAL_EXPORT_DIR, jobId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, buffer);
  return { url: `local:${jobId}/${fileName}`, size: buffer.length };
}

export async function readExportFile(url: string): Promise<{ buffer: Buffer } | { redirect: string }> {
  if (url.startsWith('local:')) {
    const rel = url.slice('local:'.length);
    const buffer = await readFile(path.join(LOCAL_EXPORT_DIR, rel));
    return { buffer };
  }
  return { redirect: url };
}

export async function deleteExportFile(url: string): Promise<void> {
  try {
    if (url.startsWith('local:')) {
      const rel = url.slice('local:'.length);
      await rm(path.join(LOCAL_EXPORT_DIR, path.dirname(rel)), { recursive: true, force: true });
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(url);
    }
  } catch {
    // best-effort cleanup only
  }
}
