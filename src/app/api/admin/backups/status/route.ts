import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi, PRIVATE_NO_STORE_HEADERS } from '@/lib/admin-auth';
import { AUTO_BACKUP_RETENTION_DAYS } from '@/lib/backup/catalog';
import {
  AUTO_BACKUP_CATCHUP_SCHEDULE_UTC,
  AUTO_BACKUP_GRACE_MINUTES,
  AUTO_BACKUP_LOCAL_SCHEDULE_LABEL,
  AUTO_BACKUP_SCHEDULE_UTC,
  AUTO_BACKUP_TIME_ZONE,
  AUTOMATIC_BACKUP_KIND,
  autoBackupWindow,
  classifyBackupDay,
  describeScheduler,
  nextAutoBackupWindow,
  utcDateKey,
  type BackupRunView,
  type SchedulerEnvironment,
} from '@/lib/backup/schedule';
import { isBackupStorageConfigured, listBackups, type BackupHistoryItem } from '@/lib/backup/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schedulerEnvironment = (): SchedulerEnvironment => {
  const value = process.env.VERCEL_ENV;
  return value === 'production' || value === 'preview' ? value : 'development';
};

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const warnings: string[] = [];
  const now = new Date();

  let backups: BackupHistoryItem[] = [];
  try {
    backups = await listBackups();
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'Backup history is unavailable.');
  }

  let runs: BackupRunView[] = [];
  let previousRuns: Array<BackupRunView & { dateKey: string | null }> = [];
  try {
    const rows = await prisma.backupRun.findMany({
      where: { kind: AUTOMATIC_BACKUP_KIND },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        id: true, dateKey: true, status: true, trigger: true, attempts: true,
        startedAt: true, finishedAt: true, error: true, sha256: true, size: true, fileCount: true,
      },
    });
    previousRuns = rows.map((row) => ({
      id: row.id,
      dateKey: row.dateKey,
      status: row.status,
      trigger: row.trigger,
      attempts: row.attempts,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
      error: row.error,
      sha256: row.sha256,
      size: row.size,
      fileCount: row.fileCount,
    }));
    runs = previousRuns;
  } catch {
    warnings.push('Execution history is unavailable. The database could not be reached.');
  }

  const dateKey = utcDateKey(now);
  const latestAutomaticBackup = backups.find((row) => row.type === 'automatic') ?? null;
  const todayBackup = backups.find((row) => row.type === 'automatic' && row.createdAt.slice(0, 10) === dateKey) ?? null;
  const todayRun = previousRuns.find((row) => row.dateKey === dateKey) ?? null;
  const scheduler = describeScheduler(schedulerEnvironment(), Boolean(process.env.CRON_SECRET?.trim()));
  const window = autoBackupWindow(now);
  const today = classifyBackupDay({ now, window, hasVerifiedBackup: Boolean(todayBackup), run: todayRun, scheduler });

  return NextResponse.json({
    ok: true,
    data: {
      serverTime: now.toISOString(),
      scheduler,
      schedule: {
        cron: AUTO_BACKUP_SCHEDULE_UTC,
        catchUpCron: AUTO_BACKUP_CATCHUP_SCHEDULE_UTC,
        timeZone: AUTO_BACKUP_TIME_ZONE,
        localLabel: AUTO_BACKUP_LOCAL_SCHEDULE_LABEL,
        graceMinutes: AUTO_BACKUP_GRACE_MINUTES,
      },
      storageConfigured: isBackupStorageConfigured(),
      retentionDays: AUTO_BACKUP_RETENTION_DAYS,
      today: { dateKey, state: today.state, canRetry: today.canRetry, window },
      nextWindow: nextAutoBackupWindow(now),
      latestAutomaticBackup,
      todayBackup,
      todayRun,
      runs,
      warnings,
    },
  }, { headers: PRIVATE_NO_STORE_HEADERS });
}
