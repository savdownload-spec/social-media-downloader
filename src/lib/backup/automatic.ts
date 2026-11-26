import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { buildBackup } from './archive';
import { ALL_BACKUP_CATEGORIES, AUTO_BACKUP_RETENTION_DAYS } from './catalog';
import {
  AUTOMATIC_BACKUP_KIND,
  AUTO_BACKUP_STALE_RUN_MINUTES,
  BACKUP_RUN_STATUS,
  selectAutomaticBackupsToPrune,
  utcDateKey,
  type BackupTrigger,
} from './schedule';
import {
  assertBackupStorageConfigured,
  deleteBackup,
  deleteBackupArchive,
  listBackups,
  storeBackupArchive,
  storeBackupMetadata,
  type BackupHistoryItem,
} from './storage';
import { BackupVerificationError, sha256Of, verifyStoredBackup } from './verify';

export type AutomaticBackupActor = { id: string; email: string; automatic: boolean };

export type AutomaticBackupResult = {
  skipped: boolean;
  status: 'completed' | 'running';
  backup: BackupHistoryItem | null;
  downloadUrl: string | null;
  runId: string | null;
  attempts: number;
  trigger: BackupTrigger;
  verification: { sha256: string; fileCount: number; recordCount: number } | null;
  pruned: number;
  retentionDays: number;
  warnings: string[];
};

type ClaimResult =
  | { mode: 'claimed'; runId: string; attempts: number }
  | { mode: 'skip'; reason: 'running'; runId: string; attempts: number }
  | { mode: 'skip'; reason: 'completed'; runId: string; backupId: string | null; attempts: number };

const downloadUrl = (id: string) => `/api/admin/backups/${id}/download`;
const staleRunMs = AUTO_BACKUP_STALE_RUN_MINUTES * 60 * 1000;
const isUniqueViolation = (error: unknown) => (error as { code?: string } | null)?.code === 'P2002';

async function claimDailyRun(input: {
  dateKey: string;
  now: Date;
  trigger: BackupTrigger;
  createdBy: string;
}): Promise<ClaimResult> {
  try {
    const run = await prisma.backupRun.create({
      data: {
        kind: AUTOMATIC_BACKUP_KIND,
        dateKey: input.dateKey,
        status: BACKUP_RUN_STATUS.RUNNING,
        trigger: input.trigger,
        createdBy: input.createdBy,
        startedAt: input.now,
      },
    });
    return { mode: 'claimed', runId: run.id, attempts: run.attempts };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  const existing = await prisma.backupRun.findUnique({
    where: { kind_dateKey: { kind: AUTOMATIC_BACKUP_KIND, dateKey: input.dateKey } },
  });
  if (!existing) throw new Error('Could not acquire the daily backup lock. Try again.');

  if (existing.status === BACKUP_RUN_STATUS.COMPLETED) {
    return { mode: 'skip', reason: 'completed', runId: existing.id, backupId: existing.backupId, attempts: existing.attempts };
  }
  const isFresh = existing.status === BACKUP_RUN_STATUS.RUNNING
    && input.now.getTime() - existing.startedAt.getTime() < staleRunMs;
  if (isFresh) {
    return { mode: 'skip', reason: 'running', runId: existing.id, attempts: existing.attempts };
  }

  // Compare-and-set takeover: only one concurrent caller can win this update.
  const takeover = await prisma.backupRun.updateMany({
    where: { id: existing.id, status: existing.status, attempts: existing.attempts },
    data: {
      status: BACKUP_RUN_STATUS.RUNNING,
      trigger: input.trigger,
      createdBy: input.createdBy,
      attempts: { increment: 1 },
      startedAt: input.now,
      finishedAt: null,
      error: null,
    },
  });
  if (takeover.count === 0) {
    return { mode: 'skip', reason: 'running', runId: existing.id, attempts: existing.attempts };
  }
  return { mode: 'claimed', runId: existing.id, attempts: existing.attempts + 1 };
}

/** Records an archive created before run tracking existed, or by a parallel path. */
async function recordExistingCompletion(
  dateKey: string,
  backup: BackupHistoryItem,
  trigger: BackupTrigger,
  createdBy: string,
): Promise<void> {
  try {
    await prisma.backupRun.upsert({
      where: { kind_dateKey: { kind: AUTOMATIC_BACKUP_KIND, dateKey } },
      create: {
        kind: AUTOMATIC_BACKUP_KIND,
        dateKey,
        status: BACKUP_RUN_STATUS.COMPLETED,
        trigger,
        createdBy,
        backupId: backup.id,
        fileName: backup.fileName,
        size: backup.size,
        sha256: backup.sha256 ?? null,
        recordCounts: backup.recordCounts,
        fileCount: backup.fileCount,
        startedAt: new Date(backup.createdAt),
        finishedAt: new Date(backup.createdAt),
      },
      update: {
        status: BACKUP_RUN_STATUS.COMPLETED,
        backupId: backup.id,
        fileName: backup.fileName,
        size: backup.size,
        sha256: backup.sha256 ?? null,
        recordCounts: backup.recordCounts,
        fileCount: backup.fileCount,
        finishedAt: new Date(backup.createdAt),
        error: null,
      },
    });
  } catch {
    // The archive is already verified; execution tracking is best-effort here.
  }
}

function skippedResult(backup: BackupHistoryItem, trigger: BackupTrigger, runId: string | null, attempts: number): AutomaticBackupResult {
  return {
    skipped: true,
    status: 'completed',
    backup,
    downloadUrl: downloadUrl(backup.id),
    runId,
    attempts,
    trigger,
    verification: backup.sha256 ? { sha256: backup.sha256, fileCount: backup.fileCount, recordCount: sumRecords(backup) } : null,
    pruned: 0,
    retentionDays: AUTO_BACKUP_RETENTION_DAYS,
    warnings: [],
  };
}

function runningResult(runId: string, attempts: number, trigger: BackupTrigger): AutomaticBackupResult {
  return {
    skipped: true,
    status: 'running',
    backup: null,
    downloadUrl: null,
    runId,
    attempts,
    trigger,
    verification: null,
    pruned: 0,
    retentionDays: AUTO_BACKUP_RETENTION_DAYS,
    warnings: ['Another automatic backup for this UTC date is already running.'],
  };
}

const sumRecords = (item: Pick<BackupHistoryItem, 'recordCounts'>) => Object.values(item.recordCounts).reduce((total, count) => total + count, 0);

export async function runAutomaticBackup(
  actor: AutomaticBackupActor,
  options: { now?: Date; trigger?: BackupTrigger } = {},
): Promise<AutomaticBackupResult> {
  assertBackupStorageConfigured();

  const now = options.now ?? new Date();
  const trigger = options.trigger ?? (actor.automatic ? 'cron' : 'admin');
  const dateKey = utcDateKey(now);
  const createdBy = actor.automatic ? 'Automatic daily backup' : actor.email;

  let claim = await claimDailyRun({ dateKey, now, trigger, createdBy });
  if (claim.mode === 'skip' && claim.reason === 'completed') {
    // The run claims completion, but the archive may have been deleted by an admin.
    const rows = await listBackups();
    const completedBackupId = claim.backupId;
    const backup = completedBackupId ? rows.find((row) => row.id === completedBackupId) : undefined;
    if (backup) return skippedResult(backup, trigger, claim.runId, claim.attempts);
    await prisma.backupRun.updateMany({
      where: { id: claim.runId, status: BACKUP_RUN_STATUS.COMPLETED },
      data: { status: BACKUP_RUN_STATUS.FAILED, error: 'The stored archive is missing; a replacement backup is required.' },
    });
    claim = await claimDailyRun({ dateKey, now, trigger, createdBy });
  }
  if (claim.mode === 'skip') {
    if (claim.reason === 'completed') throw new Error('Could not replace the missing daily backup.');
    return runningResult(claim.runId, claim.attempts, trigger);
  }

  const { runId, attempts } = claim;
  const backupId = crypto.randomUUID();
  const warnings: string[] = [];
  let fileName = '';
  let archiveStored = false;
  let metadataStored = false;
  let metadata: BackupHistoryItem | null = null;
  let verified: Awaited<ReturnType<typeof verifyStoredBackup>> | null = null;

  try {
    // The daily row is claimed before touching storage so a storage outage is
    // recorded as a failed attempt instead of vanishing.
    const rows = await listBackups();
    const existingToday = rows.find((row) => row.type === 'automatic' && row.createdAt.slice(0, 10) === dateKey);
    if (existingToday) {
      await recordExistingCompletion(dateKey, existingToday, trigger, createdBy);
      return skippedResult(existingToday, trigger, runId, attempts);
    }

    const built = await buildBackup({ categories: ALL_BACKUP_CATEGORIES, createdBy });
    fileName = built.fileName;
    warnings.push(...built.warnings);
    const sha256 = sha256Of(built.buffer);
    metadata = {
      id: backupId,
      type: 'automatic',
      fileName,
      size: built.buffer.length,
      createdAt: built.manifest.createdAt,
      createdBy,
      categories: ALL_BACKUP_CATEGORIES,
      recordCounts: built.manifest.recordCounts,
      fileCount: built.manifest.fileCount,
      sha256,
    };

    await storeBackupArchive(backupId, fileName, built.buffer);
    archiveStored = true;

    // Re-download and validate before the archive can count as a backup.
    verified = await verifyStoredBackup(backupId, fileName, sha256);
    await storeBackupMetadata(backupId, metadata);
    metadataStored = true;
  } catch (error) {
    if (archiveStored && !metadataStored && fileName) await deleteBackupArchive(backupId, fileName).catch(() => undefined);
    const verificationFailed = error instanceof BackupVerificationError;
    const message = error instanceof Error ? error.message : 'Automatic backup failed.';
    await prisma.backupRun.updateMany({
      where: { id: runId },
      data: {
        status: verificationFailed ? BACKUP_RUN_STATUS.VERIFICATION_FAILED : BACKUP_RUN_STATUS.FAILED,
        error: message.slice(0, 500),
        finishedAt: new Date(),
      },
    }).catch(() => undefined);
    throw error;
  }

  // From here the verified archive exists. Terminal bookkeeping failures must
  // never delete it or report a failed backup.
  const completed = metadata as BackupHistoryItem;
  const verification = verified as Awaited<ReturnType<typeof verifyStoredBackup>>;
  const pruned = await pruneOlderAutomaticBackups(backupId, warnings);

  try {
    await prisma.backupRun.update({
      where: { id: runId },
      data: {
        status: BACKUP_RUN_STATUS.COMPLETED,
        backupId,
        fileName: completed.fileName,
        size: completed.size,
        sha256: completed.sha256 ?? null,
        recordCounts: completed.recordCounts,
        fileCount: completed.fileCount,
        warnings,
        error: null,
        finishedAt: new Date(),
      },
    });
  } catch {
    warnings.push('The backup is verified, but its execution record could not be updated.');
  }

  try {
    await writeAuditLog({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'backup.auto',
      targetType: 'Backup',
      targetId: backupId,
      detail: {
        automatic: actor.automatic,
        trigger,
        runId,
        attempts,
        categories: ALL_BACKUP_CATEGORIES,
        recordCounts: completed.recordCounts,
        fileCount: completed.fileCount,
        size: completed.size,
        sha256: completed.sha256,
        verified: true,
        retentionDays: AUTO_BACKUP_RETENTION_DAYS,
        pruned,
      },
    });
  } catch {
    warnings.push('The backup is verified, but the audit entry could not be written.');
  }

  return {
    skipped: false,
    status: 'completed',
    backup: completed,
    downloadUrl: downloadUrl(backupId),
    runId,
    attempts,
    trigger,
    verification: { sha256: verification.sha256, fileCount: verification.fileCount, recordCount: verification.recordCount },
    pruned,
    retentionDays: AUTO_BACKUP_RETENTION_DAYS,
    warnings,
  };
}

async function pruneOlderAutomaticBackups(keepId: string, warnings: string[]): Promise<number> {
  let pruned = 0;
  try {
    const rows = await listBackups();
    const toDelete = selectAutomaticBackupsToPrune(rows, keepId, AUTO_BACKUP_RETENTION_DAYS);
    for (const id of toDelete) {
      try {
        await deleteBackup(id);
        pruned += 1;
      } catch {
        warnings.push('An older automatic backup could not be pruned.');
      }
    }
  } catch {
    warnings.push('The backup was saved and verified, but the retention check could not run.');
  }
  return pruned;
}
