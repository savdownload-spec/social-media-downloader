import { mkdir, readFile, readdir, rm, stat, writeFile } from 'fs/promises';
import path from 'path';
import { del, get, list, put } from '@vercel/blob';

export type BackupHistoryItem = {
  id: string;
  type: 'backup' | 'recovery';
  fileName: string;
  size: number;
  createdAt: string;
  createdBy: string;
  categories: string[];
  recordCounts: Record<string, number>;
  fileCount: number;
};

const LOCAL_DIR = path.join(process.cwd(), '.backup-cache');
const safeId = (id: string) => /^[a-f0-9-]{36}$/i.test(id);

export async function storeBackup(id: string, fileName: string, buffer: Buffer, metadata: BackupHistoryItem) {
  if (!safeId(id)) throw new Error('Invalid backup identifier.');
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const archive = await put(`backups/${id}/${fileName}`, buffer, {
      access: 'private', contentType: 'application/zip', addRandomSuffix: false,
    });
    await put(`backups/${id}/metadata.json`, JSON.stringify(metadata), {
      access: 'private', contentType: 'application/json', addRandomSuffix: false,
    });
    return archive.url;
  }
  if (process.env.VERCEL) throw new Error('Backup storage is not configured. Connect Vercel Blob with BLOB_READ_WRITE_TOKEN and redeploy.');
  const directory = path.join(LOCAL_DIR, id);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, fileName), buffer),
    writeFile(path.join(directory, 'metadata.json'), JSON.stringify(metadata, null, 2)),
  ]);
  return `local:${id}/${fileName}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const result = await get(url, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) throw new Error('Could not read backup metadata.');
  return JSON.parse(Buffer.from(await new Response(result.stream).arrayBuffer()).toString('utf8')) as T;
}

export async function listBackups(): Promise<BackupHistoryItem[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result: BackupHistoryItem[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: 'backups/', cursor, limit: 1000 });
      const metadata = page.blobs.filter((blob) => blob.pathname.endsWith('/metadata.json'));
      const rows = await Promise.all(metadata.map((blob) => fetchJson<BackupHistoryItem>(blob.url).catch(() => null)));
      result.push(...rows.filter((row): row is BackupHistoryItem => !!row));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  if (process.env.VERCEL) return [];
  const directories = await readdir(LOCAL_DIR, { withFileTypes: true }).catch(() => []);
  const rows = await Promise.all(directories.filter((entry) => entry.isDirectory()).map(async (entry) => {
    try { return JSON.parse(await readFile(path.join(LOCAL_DIR, entry.name, 'metadata.json'), 'utf8')) as BackupHistoryItem; }
    catch { return null; }
  }));
  return rows.filter((row): row is BackupHistoryItem => !!row).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readBackup(id: string): Promise<{ buffer: Buffer; metadata: BackupHistoryItem }> {
  if (!safeId(id)) throw new Error('Invalid backup identifier.');
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const page = await list({ prefix: `backups/${id}/`, limit: 10 });
    const archive = page.blobs.find((blob) => blob.pathname.endsWith('.zip'));
    const metadataBlob = page.blobs.find((blob) => blob.pathname.endsWith('/metadata.json'));
    if (!archive || !metadataBlob) throw new Error('Backup not found.');
    const [archiveResult, metadata] = await Promise.all([
      get(archive.url, { access: 'private', useCache: false }),
      fetchJson<BackupHistoryItem>(metadataBlob.url),
    ]);
    if (!archiveResult || archiveResult.statusCode !== 200) throw new Error('Backup file is unavailable.');
    return { buffer: Buffer.from(await new Response(archiveResult.stream).arrayBuffer()), metadata };
  }
  const metadata = JSON.parse(await readFile(path.join(LOCAL_DIR, id, 'metadata.json'), 'utf8')) as BackupHistoryItem;
  const filePath = path.join(LOCAL_DIR, id, path.basename(metadata.fileName));
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error('Backup not found.');
  return { buffer: await readFile(filePath), metadata };
}

export async function deleteBackup(id: string) {
  if (!safeId(id)) throw new Error('Invalid backup identifier.');
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const page = await list({ prefix: `backups/${id}/`, limit: 20 });
    if (!page.blobs.length) throw new Error('Backup not found.');
    await del(page.blobs.map((blob) => blob.url));
    return;
  }
  await rm(path.join(LOCAL_DIR, id), { recursive: true, force: true });
}
