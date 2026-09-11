import { del, get } from '@vercel/blob';

export type PdfUploadRef = { url: string; name: string; size?: number };

export async function readPdfUploadRefs(refs: PdfUploadRef[]): Promise<{ buffers: Buffer[]; names: string[]; urls: string[] }> {
  const buffers: Buffer[] = [];
  const names: string[] = [];
  const urls: string[] = [];
  for (const ref of refs) {
    if (!ref.url.startsWith('https://')) throw new Error('Invalid uploaded file reference.');
    const blob = await get(ref.url, { access: 'private' });
    if (!blob || blob.statusCode !== 200) throw new Error('Uploaded file is no longer available.');
    buffers.push(Buffer.from(await new Response(blob.stream).arrayBuffer()));
    names.push(ref.name);
    urls.push(ref.url);
  }
  return { buffers, names, urls };
}

export async function cleanupPdfUploadRefs(urls: string[]): Promise<void> {
  const safeUrls = urls.filter((url) => {
    try { return new URL(url).protocol === 'https:' && new URL(url).pathname.includes('/pdf-jobs/'); }
    catch { return false; }
  });
  if (safeUrls.length) await del(safeUrls).catch(() => undefined);
}
