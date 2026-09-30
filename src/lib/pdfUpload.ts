import { del, get } from '@vercel/blob';

export type PdfUploadRef = { url: string; name: string; size?: number };

// Allowed Vercel Blob hostnames. The env var BLOB_READ_WRITE_TOKEN determines
// the actual store; these patterns guard against a client submitting an
// arbitrary https:// URL and forcing the server to fetch it (SSRF).
const ALLOWED_BLOB_HOSTS = [
  /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/,
  /^[a-z0-9-]+\.vercel-storage\.com$/,
  /^[a-z0-9-]+\.blob\.vercel\.app$/,
];

function isTrustedBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_BLOB_HOSTS.some((pattern) => pattern.test(parsed.hostname));
  } catch {
    return false;
  }
}

export async function readPdfUploadRefs(refs: PdfUploadRef[]): Promise<{ buffers: Buffer[]; names: string[]; urls: string[] }> {
  const buffers: Buffer[] = [];
  const names: string[] = [];
  const urls: string[] = [];
  for (const ref of refs) {
    if (!isTrustedBlobUrl(ref.url)) {
      throw new Error('Invalid uploaded file reference — URL is not from the expected storage host.');
    }
    const blob = await get(ref.url, { access: 'private' });
    if (!blob || blob.statusCode !== 200) throw new Error('Uploaded file is no longer available.');
    buffers.push(Buffer.from(await new Response(blob.stream).arrayBuffer()));
    names.push(ref.name);
    urls.push(ref.url);
  }
  return { buffers, names, urls };
}

export async function cleanupPdfUploadRefs(urls: string[]): Promise<void> {
  const safeUrls = urls.filter(isTrustedBlobUrl).filter((url) => {
    try { return new URL(url).pathname.includes('/pdf-jobs/'); }
    catch { return false; }
  });
  if (safeUrls.length) await del(safeUrls).catch(() => undefined);
}
