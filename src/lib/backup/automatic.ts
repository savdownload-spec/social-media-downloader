import crypto from 'crypto';
import { writeAuditLog } from '@/lib/admin';
import { buildBackup } from './archive';
import { ALL_BACKUP_CATEGORIES, AUTO_BACKUP_RETENTION_DAYS } from './catalog';
import {
  assertBackupStorageConfigured,
  deleteBackup,
  listBackups,
  storeBackup,
  type BackupHistoryItem,
} from './storage';

export type AutomaticBackupActor = { id: string; email: string; automatic: boolean };

export type AutomaticBackupResult = {
  skipped: boolean;
  backup: BackupHistoryItem;
  downloadUrl: string;
  pruned: number;
  retentionDays: number;
  warnings: string[];
};

const downloadUrl = (id: string) => `/api/admin/backups/${id}/download`;

export async function runAutomaticBackup(
  actor: AutomaticBackupActor,
  now = new Date(),
): Promise<AutomaticBackupResult> {
  assertBackupStorageConfigured();

  const today = now.toISOString().slice(0, 10);
  const existing = (await listBackups()).find(
    (row) => row.type === 'automatic' && row.createdAt.slice(0, 10) === today,
  );
  if (existing) {
    return {
      skipped: true,
      backup: existing,
      downloadUrl: downloadUrl(existing.id),
      pruned: 0,
      retentionDays: AUTO_BACKUP_RETENTION_DAYS,
      warnings: [],
    };
  }

  const createdBy = actor.automatic ? 'Automatic daily backup' : actor.email;
  const built = await buildBackup({ categories: ALL_BACKUP_CATEGORIES, createdBy });
  const id = crypto.randomUUID();
  const metadata: BackupHistoryItem = {
    id,
    type: 'automatic',
    fileName: built.fileName,
    size: built.buffer.length,
    createdAt: built.manifest.createdAt,
    createdBy,
    categories: ALL_BACKUP_CATEGORIES,
    recordCounts: built.manifest.recordCounts,
    fileCount: built.manifest.fileCount,
  };
  await storeBackup(id, built.fileName, built.buffer, metadata);

  const warnings = [...built.warnings];
  let pruned = 0;
  try {
    const rows = await listBackups();
    const automatic = rows
      .filter((row) => row.type === 'automatic')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const sameDay = automatic.filter((row) => row.createdAt.slice(0, 10) === today);
    const keep = sameDay.find((row) => row.id === id) ?? sameDay[0] ?? metadata;
    const toDelete = new Set<string>();
    for (const row of sameDay) if (row.id !== keep.id) toDelete.add(row.id);
    for (const row of automatic.slice(AUTO_BACKUP_RETENTION_DAYS)) {
      if (row.id !== keep.id) toDelete.add(row.id);
    }
    for (const deleteId of toDelete) {
      try {
        await deleteBackup(deleteId);
        pruned += 1;
      } catch {
        warnings.push('An older automatic backup could not be pruned.');
      }
    }
  } catch {
    warnings.push('The backup was saved, but the retention check could not run.');
  }

  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'backup.auto',
    targetType: 'Backup',
    targetId: id,
    detail: {
      automatic: actor.automatic,
      categories: ALL_BACKUP_CATEGORIES,
      recordCounts: built.manifest.recordCounts,
      fileCount: built.manifest.fileCount,
      size: built.buffer.length,
      retentionDays: AUTO_BACKUP_RETENTION_DAYS,
      pruned,
    },
  });

  return {
    skipped: false,
    backup: metadata,
    downloadUrl: downloadUrl(id),
    pruned,
    retentionDays: AUTO_BACKUP_RETENTION_DAYS,
    warnings,
  };
}
