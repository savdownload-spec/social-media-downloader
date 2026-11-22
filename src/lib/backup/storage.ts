import { mkdir, readFile, readdir, rm, stat, writeFile } from 'fs/promises';
import path from 'path';
import { del, get, list, put } from '@vercel/blob';

export type BackupHistoryItem = {
  id: string;
  type: 'backup' | 'recovery' | 'automatic';
  fileName: string;
  size: number;
  createdAt: string;
  createdBy: string;
  categories: string[];
  recordCounts: Record<string, number>;
  fileCount: number;
  /** SHA-256 of the stored ZIP. Absent on archives created before 2026-11-22. */
  sha256?: string;
};

// Non-Vercel hosts keep backups on disk. Override the directory in isolated
// tests so they can never read, prune, or overwrite real local archives.
const localDir = () => process.env.BACKUP_LOCAL_DIR
  ? path.resolve(process.env.BACKUP_LOCAL_DIR)
  : path.join(process.cwd(), '.backup-cache');
const safeId = (id: string) => /^[a-f0-9-]{36}$/i.test(id);

type BackupBlobAuth = { token?: string; storeId?: string };

const BACKUP_STORAGE_SETUP_ERROR =
  'Secure backup storage is not configured. Create a separate Vercel Blob store with Private access, set BACKUP_BLOB_READ_WRITE_TOKEN (recommended) or BACKUP_BLOB_STORE_ID for that store in Production and Preview, then redeploy. The public BLOB_READ_WRITE_TOKEN cannot store backups.';

export class BackupStorageConfigurationError extends Error {
  constructor(message?: string) {
    super(message ?? BACKUP_STORAGE_SETUP_ERROR);
    this.name = 'BackupStorageConfigurationError';
  }
}

function backupBlobAuth(): BackupBlobAuth | null {
  const token = process.env.BACKUP_BLOB_READ_WRITE_TOKEN?.trim();
  // A mis-pasted or rotated credential can hold a PEM block instead of a
  // token; sending it as a Bearer header throws, so only accept token-shaped
  // values and fall back to the store ID (OIDC).
  if (token && !/-----BEGIN/.test(token) && !/\s/.test(token)) return { token };
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

export function isBackupStorageConfigured(): boolean {
  if (!process.env.VERCEL) return true;
  try {
    assertBackupStorageConfigured();
    return true;
  } catch {
    return false;
  }
}

export function assertBackupStorageConfigured(): void {
  if (!process.env.VERCEL) return;
  const auth = backupBlobAuth();
  if (!auth) throw new BackupStorageConfigurationError();
  // A manually added VERCEL_OIDC_TOKEN shadows the one Vercel injects; when it
  // is not JWT-shaped (e.g. a pasted public key) the Blob SDK fails deep inside
  // its OIDC exchange with a cryptic header error, so fail here with the fix.
  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (auth.storeId && oidc && !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(oidc)) {
    throw new BackupStorageConfigurationError(
      'VERCEL_OIDC_TOKEN is set but is not a valid OIDC token (it looks like a public key). Delete the VERCEL_OIDC_TOKEN environment variable in Vercel (Production and Preview) so Vercel can inject its own, then redeploy.',
    );
  }
}

const archiveKey = (id: string, fileName: string) => `backups/${id}/${path.basename(fileName)}`;
const metadataKey = (id: string) => `backups/${id}/metadata.json`;

/**
 * Two-phase storage. The ZIP is written first, then read back and validated,
 * and only then is `metadata.json` written. Metadata is the completion marker:
 * an archive without it is never listed as a successful backup.
 */
export async function storeBackupArchive(id: string, fileName: string, buffer: Buffer): Promise<string> {
  if (!safeId(id)) throw new Error('Invalid backup identifier.');
  const auth = backupBlobAuth();
  if (auth) {
    try {
      const archive = await put(archiveKey(id, fileName), buffer, {
        ...auth, access: 'private', contentType: 'application/zip', addRandomSuffix: false,
      });
      return archive.url;
    } catch (error) {
      throw storageError(error);
    }
  }
  if (process.env.VERCEL) throw new BackupStorageConfigurationError();
  const directory = path.join(localDir(), id);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, path.basename(fileName)), buffer);
    return `local:${id}/${fileName}`;
  } catch (error) {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

export async function storeBackupMetadata(id: string, metadata: BackupHistoryItem): Promise<void> {
  if (!safeId(id)) throw new Error('Invalid backup identifier.');
  const auth = backupBlobAuth();
  if (auth) {
    try {
      await put(metadataKey(id), JSON.stringify(metadata), {
        ...auth, access: 'private', contentType: 'application/json', addRandomSuffix: false,
      });
      return;
    } catch (error) {
      throw storageError(error);
    }
  }
  if (process.env.VERCEL) throw new BackupStorageConfigurationError();
  await writeFile(path.join(localDir(), id, 'metadata.json'), JSON.stringify(metadata, null, 2));
}

export async function readBackupArchive(id: string, fileName: string): Promise<Buffer> {
  if (!safeId(id)) throw new Error('Invalid backup identifier.');
  const auth = backupBlobAuth();
  if (auth) {
    try {
      const page = await list({ ...auth, prefix: `backups/${id}/`, limit: 1000 });
      const archive = page.blobs.find((blob) => blob.pathname === archiveKey(id, fileName));
      if (!archive) throw new Error('Backup file is unavailable.');
      const result = await get(archive.url, { ...auth, access: 'private', useCache: false });
      if (!result || result.statusCode !== 200) throw new Error('Backup file is unavailable.');
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    } catch (error) {
      if (error instanceof Error && error.message === 'Backup file is unavailable.') throw error;
      throw storageError(error);
    }
  }
  if (process.env.VERCEL) throw new BackupStorageConfigurationError();
  return readFile(path.join(localDir(), id, path.basename(fileName)));
}

/** Best-effort cleanup for archives that failed verification or completion. */
export async function deleteBackupArchive(id: string, fileName: string): Promise<void> {
  if (!safeId(id)) return;
  const auth = backupBlobAuth();
  if (auth) {
    const key = archiveKey(id, fileName);
    const page = await list({ ...auth, prefix: key, limit: 10 }).catch(() => null);
    const urls = page?.blobs.filter((blob) => blob.pathname === key).map((blob) => blob.url) ?? [];
    if (urls.length) await del(urls, auth).catch(() => undefined);
    return;
  }
  if (process.env.VERCEL) return;
  await rm(path.join(localDir(), id, path.basename(fileName)), { force: true }).catch(() => undefined);
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
  const directories = await readdir(localDir(), { withFileTypes: true }).catch(() => []);
  const rows = await Promise.all(directories.filter((entry) => entry.isDirectory()).map(async (entry) => {
    try { return JSON.parse(await readFile(path.join(localDir(), entry.name, 'metadata.json'), 'utf8')) as BackupHistoryItem; }
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
  const metadata = JSON.parse(await readFile(path.join(localDir(), id, 'metadata.json'), 'utf8')) as BackupHistoryItem;
  const filePath = path.join(localDir(), id, path.basename(metadata.fileName));
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
  await rm(path.join(localDir(), id), { recursive: true, force: true });
}
