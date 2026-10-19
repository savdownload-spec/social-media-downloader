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

type BackupBlobAuth = { token?: string; storeId?: string };

const BACKUP_STORAGE_SETUP_ERROR =
  'Secure backup storage is not configured. Create a separate Vercel Blob store with Private access, set BACKUP_BLOB_READ_WRITE_TOKEN (recommended) or BACKUP_BLOB_STORE_ID for that store in Production and Preview, then redeploy. The public BLOB_READ_WRITE_TOKEN cannot store backups.';

export class BackupStorageConfigurationError extends Error {
  constructor() {
    super(BACKUP_STORAGE_SETUP_ERROR);
    this.name = 'BackupStorageConfigurationError';
  }
}

function backupBlobAuth(): BackupBlobAuth | null {
  const token = process.env.BACKUP_BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return { token };
  const storeId = process.env.BACKUP_BLOB_STORE_ID?.trim();
  if (storeId) return { storeId };
  return null;
}

function storageError(error: unknown): Error {
  const message = error instanceof Error ? error.message : '';
  if (/private access|public store|configured with private|store.*private/i.test(message)) {
    return new BackupStorageConfigurationError();
  }
  return new Error('Secure backup storage failed. Verify the dedicated private Blob store connection and try again.');
}

function requireBackupBlobAuth(): BackupBlobAuth {
  const auth = backupBlobAuth();
  if (!auth) throw new BackupStorageConfigurationError();
  return auth;
}

export function assertBackupStorageConfigured(): void {
  if (process.env.VERCEL && !backupBlobAuth()) throw new BackupStorageConfigurationError();
}

export async function storeBackup(id: string, fileName: string, buffer: Buffer, metadata: BackupHistoryItem) {
  if (!safeId(id)) throw new Error('Invalid backup identifier.');
  const auth = backupBlobAuth();
  if (auth) {
    let archiveUrl: string | null = null;
    const archivePath = `backups/${id}/${fileName}`;
    const metadataPath = `backups/${id}/metadata.json`;
    try {
      const archive = await put(archivePath, buffer, {
        ...auth, access: 'private', contentType: 'application/zip', addRandomSuffix: false,
      });
      archiveUrl = archive.url;
      // Metadata is the completion marker used by history. Write it only after
      // the complete ZIP is durably stored.
      await put(metadataPath, JSON.stringify(metadata), {
        ...auth, access: 'private', contentType: 'application/json', addRandomSuffix: false,
      });
      return archive.url;
    } catch (error) {
      // A ZIP without its completion metadata is never a successful backup.
      // Best-effort deletion prevents private orphan archives after a partial upload.
      if (archiveUrl) await del([archivePath, metadataPath], auth).catch(() => undefined);
      throw storageError(error);
    }
  }
  if (process.env.VERCEL) throw new BackupStorageConfigurationError();
  const directory = path.join(LOCAL_DIR, id);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), buffer);
    await writeFile(path.join(directory, 'metadata.json'), JSON.stringify(metadata, null, 2));
    return `local:${id}/${fileName}`;
  } catch (error) {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

async function fetchJson<T>(url: string, auth: BackupBlobAuth): Promise<T> {
  const result = await get(url, { ...auth, access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) throw new Error('Could not read backup metadata.');
  return JSON.parse(Buffer.from(await new Response(result.stream).arrayBuffer()).toString('utf8')) as T;
}

export async function listBackups(): Promise<BackupHistoryItem[]> {
  const auth = backupBlobAuth();
  if (auth) {
    const result: BackupHistoryItem[] = [];
    let cursor: string | undefined;
    try {
      do {
        const page = await list({ ...auth, prefix: 'backups/', cursor, limit: 1000 });
        const metadata = page.blobs.filter((blob) => blob.pathname.endsWith('/metadata.json'));
        const rows = await Promise.all(metadata.map((blob) => fetchJson<BackupHistoryItem>(blob.url, auth)));
        result.push(...rows);
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) { throw storageError(error); }
  }
  if (process.env.VERCEL) throw new BackupStorageConfigurationError();
  const directories = await readdir(LOCAL_DIR, { withFileTypes: true }).catch(() => []);
  const rows = await Promise.all(directories.filter((entry) => entry.isDirectory()).map(async (entry) => {
    try { return JSON.parse(await readFile(path.join(LOCAL_DIR, entry.name, 'metadata.json'), 'utf8')) as BackupHistoryItem; }
    catch { return null; }
  }));
  return rows.filter((row): row is BackupHistoryItem => !!row).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readBackup(id: string): Promise<{ buffer: Buffer; metadata: BackupHistoryItem }> {
  if (!safeId(id)) throw new Error('Invalid backup identifier.');
  const auth = backupBlobAuth();
  if (auth) {
    try {
      const page = await list({ ...auth, prefix: `backups/${id}/`, limit: 10 });
      const archive = page.blobs.find((blob) => blob.pathname.endsWith('.zip'));
      const metadataBlob = page.blobs.find((blob) => blob.pathname.endsWith('/metadata.json'));
      if (!archive || !metadataBlob) throw new Error('Backup not found.');
      const [archiveResult, metadata] = await Promise.all([
        get(archive.url, { ...auth, access: 'private', useCache: false }),
        fetchJson<BackupHistoryItem>(metadataBlob.url, auth),
      ]);
      if (!archiveResult || archiveResult.statusCode !== 200) throw new Error('Backup file is unavailable.');
      return { buffer: Buffer.from(await new Response(archiveResult.stream).arrayBuffer()), metadata };
    } catch (error) {
      if (error instanceof Error && ['Backup not found.', 'Backup file is unavailable.'].includes(error.message)) throw error;
      throw storageError(error);
    }
  }
  if (process.env.VERCEL) requireBackupBlobAuth();
  const metadata = JSON.parse(await readFile(path.join(LOCAL_DIR, id, 'metadata.json'), 'utf8')) as BackupHistoryItem;
  const filePath = path.join(LOCAL_DIR, id, path.basename(metadata.fileName));
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error('Backup not found.');
  return { buffer: await readFile(filePath), metadata };
}

export async function deleteBackup(id: string) {
  if (!safeId(id)) throw new Error('Invalid backup identifier.');
  const auth = backupBlobAuth();
  if (auth) {
    try {
      const page = await list({ ...auth, prefix: `backups/${id}/`, limit: 20 });
      if (!page.blobs.length) throw new Error('Backup not found.');
      await del(page.blobs.map((blob) => blob.url), auth);
      return;
    } catch (error) {
      if (error instanceof Error && error.message === 'Backup not found.') throw error;
      throw storageError(error);
    }
  }
  if (process.env.VERCEL) requireBackupBlobAuth();
  await rm(path.join(LOCAL_DIR, id), { recursive: true, force: true });
}
