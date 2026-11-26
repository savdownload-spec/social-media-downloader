import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, PRIVATE_NO_STORE_HEADERS } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/admin';
import { buildBackup } from '@/lib/backup/archive';
import { restoreValidatedArchive, validateBackupArchive } from '@/lib/backup/restore';
import { assertBackupStorageConfigured, BackupStorageConfigurationError, deleteBackupArchive, storeBackupArchive, storeBackupMetadata, type BackupHistoryItem } from '@/lib/backup/storage';
import { sha256Of, verifyStoredBackup } from '@/lib/backup/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const mode = form?.get('mode');
  if (!form || !(file instanceof File) || (mode !== 'preview' && mode !== 'restore')) {
    return NextResponse.json({ ok: false, error: 'Choose a SavDown ZIP and a valid restore action.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
  }
  if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: 'Backup ZIP must be no larger than 50 MB.' }, { status: 413, headers: PRIVATE_NO_STORE_HEADERS });
  }

  try {
    const archive = await validateBackupArchive(Buffer.from(await file.arrayBuffer()));
    if (mode === 'preview') {
      return NextResponse.json({ ok: true, data: {
        sha256: archive.sha256,
        createdAt: archive.manifest.createdAt,
        createdBy: archive.manifest.createdBy,
        categories: archive.manifest.selectedCategories,
        recordCounts: archive.manifest.recordCounts,
        fileCount: archive.manifest.fileCount,
        mediaCount: archive.manifest.media.length,
        compressedBytes: archive.compressedBytes,
        uncompressedBytes: archive.uncompressedBytes,
        exclusions: archive.manifest.exclusions,
        conflictPolicy: 'Existing primary and unique keys are skipped. No existing row or file is overwritten or deleted.',
        confirmationPhrase: 'RESTORE',
      } }, { headers: PRIVATE_NO_STORE_HEADERS });
    }

    if (form.get('confirmation') !== 'RESTORE') {
      return NextResponse.json({ ok: false, error: 'Type RESTORE to explicitly confirm this import.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    }
    if (form.get('previewSha256') !== archive.sha256) {
      return NextResponse.json({ ok: false, error: 'The selected archive changed after preview. Preview it again before restoring.' }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });
    }

    // A restore never starts unless its recovery archive is fully built, stored, and verified.
    assertBackupStorageConfigured();
    const recoveryId = crypto.randomUUID();
    const recovery = await buildBackup({ categories: archive.manifest.selectedCategories, createdBy: auth.user.email ?? 'admin', type: 'recovery' });
    const recoverySha256 = sha256Of(recovery.buffer);
    const recoveryMetadata: BackupHistoryItem = {
      id: recoveryId, type: 'recovery', fileName: recovery.fileName, size: recovery.buffer.length,
      createdAt: recovery.manifest.createdAt, createdBy: auth.user.email ?? 'admin',
      categories: recovery.manifest.selectedCategories, recordCounts: recovery.manifest.recordCounts,
      fileCount: recovery.manifest.fileCount, sha256: recoverySha256,
    };
    await storeBackupArchive(recoveryId, recovery.fileName, recovery.buffer);
    try {
      await verifyStoredBackup(recoveryId, recovery.fileName, recoverySha256);
      await storeBackupMetadata(recoveryId, recoveryMetadata);
    } catch (error) {
      await deleteBackupArchive(recoveryId, recovery.fileName).catch(() => undefined);
      throw error;
    }

    const report = await restoreValidatedArchive(archive);
    await writeAuditLog({
      adminId: auth.user.id, adminEmail: auth.user.email ?? 'admin', action: 'backup.restore',
      targetType: 'Backup', targetId: archive.sha256,
      detail: { categories: archive.manifest.selectedCategories, recoveryId, totals: report.totals },
    });
    return NextResponse.json({ ok: true, data: { report, recovery: { ...recoveryMetadata, downloadUrl: `/api/admin/backups/${recoveryId}/download` } } }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    // Do not log Blob URLs, SDK request details, tokens, or archive data.
    console.error('Admin restore failed', error instanceof Error ? error.name : 'RestoreError');
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Restore validation failed.' },
      { status: error instanceof BackupStorageConfigurationError ? 503 : 400, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}
