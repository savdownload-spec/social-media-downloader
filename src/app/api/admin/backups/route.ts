import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, PRIVATE_NO_STORE_HEADERS } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/admin';
import { buildBackup } from '@/lib/backup/archive';
import { ALL_BACKUP_CATEGORIES, isBackupCategory } from '@/lib/backup/catalog';
import { assertBackupStorageConfigured, BackupStorageConfigurationError, deleteBackupArchive, listBackups, storeBackupArchive, storeBackupMetadata, type BackupHistoryItem } from '@/lib/backup/storage';
import { sha256Of, verifyStoredBackup } from '@/lib/backup/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const createSchema = z.object({ categories: z.array(z.string()).min(1).max(ALL_BACKUP_CATEGORIES.length) }).strict();
const encoder = new TextEncoder();
const line = (value: unknown) => encoder.encode(`${JSON.stringify(value)}\n`);

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const history = await listBackups();
    return NextResponse.json({ ok: true, data: history }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Backup history is unavailable.' },
      { status: error instanceof BackupStorageConfigurationError ? 503 : 502, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success || parsed.data.categories.some((value) => !isBackupCategory(value))) {
    return NextResponse.json({ ok: false, error: 'Choose one or more supported backup categories.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
  }

  const categories = [...new Set(parsed.data.categories)].filter(isBackupCategory);
  try { assertBackupStorageConfigured(); }
  catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Secure backup storage is not configured.' },
      { status: 503, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
  const id = crypto.randomUUID();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (phase: string, message: string, progress: number) => controller.enqueue(line({ phase, message, progress }));
      let fileName = '';
      let archiveStored = false;
      try {
        send('starting', 'Preparing secure backup…', 2);
        const built = await buildBackup({ categories, createdBy: auth.user.email ?? 'admin', onProgress: send });
        fileName = built.fileName;
        const sha256 = sha256Of(built.buffer);
        const metadata: BackupHistoryItem = {
          id, type: 'backup', fileName: built.fileName, size: built.buffer.length,
          createdAt: built.manifest.createdAt, createdBy: auth.user.email ?? 'admin', categories,
          recordCounts: built.manifest.recordCounts, fileCount: built.manifest.fileCount, sha256,
        };
        send('storing', 'Saving backup to protected history…', 88);
        await storeBackupArchive(id, built.fileName, built.buffer);
        archiveStored = true;
        send('verifying', 'Reading the archive back and verifying every checksum…', 94);
        const verified = await verifyStoredBackup(id, built.fileName, sha256);
        await storeBackupMetadata(id, metadata);
        await writeAuditLog({
          adminId: auth.user.id, adminEmail: auth.user.email ?? 'admin', action: 'backup.create',
          targetType: 'Backup', targetId: id,
          detail: {
            categories, recordCounts: built.manifest.recordCounts, fileCount: built.manifest.fileCount,
            size: built.buffer.length, sha256, verified: true, verifiedRecords: verified.recordCount,
          },
        });
        controller.enqueue(line({ phase: 'done', message: 'Backup ready to download', progress: 100, backup: { ...metadata, downloadUrl: `/api/admin/backups/${id}/download` }, warnings: built.warnings }));
      } catch (error) {
        // A ZIP without verified metadata is never a successful backup.
        if (archiveStored && fileName) await deleteBackupArchive(id, fileName).catch(() => undefined);
        // Do not log Blob URLs, SDK request details, tokens, or archive data.
        console.error('Admin backup failed', error instanceof Error ? error.name : 'BackupError');
        controller.enqueue(line({ phase: 'error', message: error instanceof Error ? error.message : 'Backup failed.' }));
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', ...PRIVATE_NO_STORE_HEADERS } });
}
