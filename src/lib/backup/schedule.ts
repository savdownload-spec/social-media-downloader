import { AUTO_BACKUP_RETENTION_DAYS } from './catalog';

/**
 * Scheduling facts shared by the server and the admin UI. Everything here is
 * pure so it can be unit-tested and imported from client components.
 *
 * Vercel legacy cron runs only on the production deployment, may fire anywhere
 * inside the scheduled hour on Hobby, and never retries. The endpoint is
 * therefore idempotent per UTC date and a second daily slot retries failures.
 */
export const AUTO_BACKUP_SCHEDULE_UTC = '0 4 * * *';
export const AUTO_BACKUP_CATCHUP_SCHEDULE_UTC = '0 8 * * *';
export const AUTO_BACKUP_TIME_ZONE = 'UTC';
export const AUTO_BACKUP_LOCAL_SCHEDULE_LABEL = '09:00 Asia/Karachi (PKT)';

/** Hobby cron can start up to 59 minutes late; two hours covers a missed delivery. */
export const AUTO_BACKUP_GRACE_MINUTES = 120;
/** A RUNNING row older than this is treated as abandoned (function timeout/crash). */
export const AUTO_BACKUP_STALE_RUN_MINUTES = 20;
export const AUTO_BACKUP_RUN_HISTORY_LIMIT = 20;

export const BACKUP_RUN_STATUS = {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
} as const;

export const AUTOMATIC_BACKUP_KIND = 'AUTOMATIC';

export type BackupRunStatus = (typeof BACKUP_RUN_STATUS)[keyof typeof BACKUP_RUN_STATUS];
export type BackupTrigger = 'cron' | 'external' | 'admin';
export type SchedulerEnvironment = 'production' | 'preview' | 'development';
export type BackupDayState =
  | 'completed'
  | 'running'
  | 'failed'
  | 'verification_failed'
  | 'scheduled'
  | 'missed'
  | 'not_configured';

export type BackupRunView = {
  id: string;
  status: string;
  trigger: string;
  attempts: number;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  sha256: string | null;
  size: number | null;
  fileCount: number | null;
};

export type BackupHistoryLike = {
  id: string;
  type: 'backup' | 'recovery' | 'automatic';
  createdAt: string;
  fileName: string;
  sha256?: string;
};

export type SchedulerInfo = {
  environment: SchedulerEnvironment;
  mechanism: 'vercel-cron' | 'external' | 'manual';
  configured: boolean;
  cronSecretConfigured: boolean;
  status: 'active' | 'external_required' | 'manual' | 'configuration_error';
  detail: string;
};

export type AutoBackupWindow = { dateKey: string; startsAt: string; endsAt: string; graceEndsAt: string };

const SCHEDULED_HOUR_UTC = 4;

export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function windowForDateKey(dateKey: string): AutoBackupWindow {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  start.setUTCHours(SCHEDULED_HOUR_UTC, 0, 0, 0);
  const end = new Date(start.getTime() + 59 * 60 * 1000);
  const graceEnd = new Date(start.getTime() + AUTO_BACKUP_GRACE_MINUTES * 60 * 1000);
  return { dateKey, startsAt: start.toISOString(), endsAt: end.toISOString(), graceEndsAt: graceEnd.toISOString() };
}

export function autoBackupWindow(now: Date): AutoBackupWindow {
  return windowForDateKey(utcDateKey(now));
}

export function nextAutoBackupWindow(now: Date): AutoBackupWindow {
  const today = autoBackupWindow(now);
  if (now.getTime() < new Date(today.startsAt).getTime()) return today;
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return autoBackupWindow(tomorrow);
}

export function describeScheduler(environment: SchedulerEnvironment, cronSecretConfigured: boolean): SchedulerInfo {
  if (environment === 'production') {
    if (!cronSecretConfigured) {
      return {
        environment, mechanism: 'vercel-cron', configured: false, cronSecretConfigured,
        status: 'configuration_error',
        detail: 'CRON_SECRET is missing. Vercel sends no Authorization header, so every scheduled run is rejected before a backup starts.',
      };
    }
    return {
      environment, mechanism: 'vercel-cron', configured: true, cronSecretConfigured,
      status: 'active',
      detail: 'Vercel invokes the production deployment daily and supplies the CRON_SECRET header.',
    };
  }
  if (environment === 'preview') {
    return {
      environment, mechanism: 'external', configured: cronSecretConfigured, cronSecretConfigured,
      status: cronSecretConfigured ? 'external_required' : 'configuration_error',
      detail: cronSecretConfigured
        ? 'Vercel never runs cron jobs on Preview deployments. An external daily scheduler must call this endpoint on dev.getsavdown.com with the CRON_SECRET header.'
        : 'CRON_SECRET is missing, so even an external scheduler would be rejected. Add it to the Preview environment and redeploy.',
    };
  }
  return {
    environment, mechanism: 'manual', configured: false, cronSecretConfigured,
    status: 'manual',
    detail: 'Local development has no scheduler. Trigger the endpoint or use the admin action.',
  };
}

export function classifyBackupDay(input: {
  now: Date;
  window: AutoBackupWindow;
  hasVerifiedBackup: boolean;
  run: BackupRunView | null;
  scheduler: SchedulerInfo;
}): { state: BackupDayState; canRetry: boolean } {
  const { now, window, hasVerifiedBackup, run, scheduler } = input;
  // A working archive created by a manual retry must not mask a broken scheduler.
  if (scheduler.status === 'configuration_error') return { state: 'not_configured', canRetry: true };
  if (hasVerifiedBackup) return { state: 'completed', canRetry: false };

  if (run?.status === BACKUP_RUN_STATUS.VERIFICATION_FAILED) {
    return { state: 'verification_failed', canRetry: true };
  }
  if (run?.status === BACKUP_RUN_STATUS.FAILED) return { state: 'failed', canRetry: true };
  if (run?.status === BACKUP_RUN_STATUS.RUNNING) {
    const age = now.getTime() - new Date(run.startedAt).getTime();
    if (age < AUTO_BACKUP_STALE_RUN_MINUTES * 60 * 1000) return { state: 'running', canRetry: false };
    return { state: 'failed', canRetry: true };
  }

  const start = new Date(window.startsAt).getTime();
  const graceEnd = new Date(window.graceEndsAt).getTime();
  if (now.getTime() < start || now.getTime() <= graceEnd) return { state: 'scheduled', canRetry: false };
  return { state: 'missed', canRetry: true };
}

/**
 * Newest `retention` automatic archives are kept, plus the archive created by
 * this run and the newest archive of its UTC day. Manual and recovery archives
 * are never returned, so the caller cannot prune them.
 */
export function selectAutomaticBackupsToPrune(
  rows: BackupHistoryLike[],
  keepId: string,
  retention = AUTO_BACKUP_RETENTION_DAYS,
): string[] {
  const automatic = rows
    .filter((row) => row.type === 'automatic')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!automatic.length) return [];

  const keepRow = automatic.find((row) => row.id === keepId) ?? automatic[0];
  const keepDay = keepRow.createdAt.slice(0, 10);
  // Legacy duplicates for this UTC day are pruned, so they never consume one
  // of the retention slots and the promise stays "one ZIP per day".
  const eligible = automatic.filter((row) => row.id === keepId || row.createdAt.slice(0, 10) !== keepDay);
  const keepIds = new Set(eligible.slice(0, Math.max(retention, 1)).map((row) => row.id));
  keepIds.add(keepId);

  return automatic.filter((row) => !keepIds.has(row.id)).map((row) => row.id);
}
