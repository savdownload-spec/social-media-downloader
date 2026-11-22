import { describe, expect, it } from 'vitest';
import {
  BACKUP_RUN_STATUS,
  autoBackupWindow,
  classifyBackupDay,
  describeScheduler,
  nextAutoBackupWindow,
  selectAutomaticBackupsToPrune,
  utcDateKey,
  type BackupHistoryLike,
  type BackupRunView,
  type SchedulerInfo,
} from './schedule';

const activeScheduler: SchedulerInfo = describeScheduler('production', true);

const run = (overrides: Partial<BackupRunView> = {}): BackupRunView => ({
  id: 'run-1',
  status: BACKUP_RUN_STATUS.RUNNING,
  trigger: 'cron',
  attempts: 1,
  startedAt: '2026-11-22T04:10:00.000Z',
  finishedAt: null,
  error: null,
  sha256: null,
  size: null,
  fileCount: null,
  ...overrides,
});

const backup = (id: string, createdAt: string, type: BackupHistoryLike['type'] = 'automatic'): BackupHistoryLike => ({
  id, type, createdAt, fileName: `${id}.zip`,
});

describe('UTC daily key', () => {
  it('uses the UTC date, not the local date', () => {
    expect(utcDateKey(new Date('2026-11-22T23:59:59.000Z'))).toBe('2026-11-22');
    expect(utcDateKey(new Date('2026-11-23T00:00:01.000Z'))).toBe('2026-11-23');
    expect(utcDateKey(new Date('2026-11-22T19:00:00.000-05:00'))).toBe('2026-11-23');
  });
});

describe('backup windows', () => {
  it('starts at 04:00 UTC and allows a two-hour grace period', () => {
    const window = autoBackupWindow(new Date('2026-11-22T10:00:00.000Z'));
    expect(window.dateKey).toBe('2026-11-22');
    expect(window.startsAt).toBe('2026-11-22T04:00:00.000Z');
    expect(window.endsAt).toBe('2026-11-22T04:59:00.000Z');
    expect(window.graceEndsAt).toBe('2026-11-22T06:00:00.000Z');
  });

  it('returns today before the scheduled hour and tomorrow afterwards', () => {
    expect(nextAutoBackupWindow(new Date('2026-11-22T02:00:00.000Z')).startsAt).toBe('2026-11-22T04:00:00.000Z');
    expect(nextAutoBackupWindow(new Date('2026-11-22T04:00:00.000Z')).startsAt).toBe('2026-11-23T04:00:00.000Z');
    expect(nextAutoBackupWindow(new Date('2026-11-22T23:59:00.000Z')).startsAt).toBe('2026-11-23T04:00:00.000Z');
  });
});

describe('classifyBackupDay', () => {
  const window = autoBackupWindow(new Date('2026-11-22T10:00:00.000Z'));
  const base = { window, scheduler: activeScheduler };

  it('reports completed when a verified archive exists', () => {
    expect(classifyBackupDay({ ...base, now: new Date('2026-11-22T05:00:00.000Z'), hasVerifiedBackup: true, run: run() }))
      .toEqual({ state: 'completed', canRetry: false });
  });

  it('reports running for a fresh RUNNING row', () => {
    expect(classifyBackupDay({ ...base, now: new Date('2026-11-22T04:20:00.000Z'), hasVerifiedBackup: false, run: run({ startedAt: '2026-11-22T04:10:00.000Z' }) }))
      .toEqual({ state: 'running', canRetry: false });
  });

  it('treats a stale RUNNING row as failed and retryable', () => {
    expect(classifyBackupDay({ ...base, now: new Date('2026-11-22T06:30:00.000Z'), hasVerifiedBackup: false, run: run({ startedAt: '2026-11-22T04:00:00.000Z' }) }))
      .toEqual({ state: 'failed', canRetry: true });
  });

  it('reports failed and verification failures separately', () => {
    expect(classifyBackupDay({ ...base, now: new Date('2026-11-22T05:00:00.000Z'), hasVerifiedBackup: false, run: run({ status: BACKUP_RUN_STATUS.FAILED, error: 'boom' }) }))
      .toEqual({ state: 'failed', canRetry: true });
    expect(classifyBackupDay({ ...base, now: new Date('2026-11-22T05:00:00.000Z'), hasVerifiedBackup: false, run: run({ status: BACKUP_RUN_STATUS.VERIFICATION_FAILED }) }))
      .toEqual({ state: 'verification_failed', canRetry: true });
  });

  it('does not mark the job missed before the grace period ends', () => {
    expect(classifyBackupDay({ ...base, now: new Date('2026-11-22T03:00:00.000Z'), hasVerifiedBackup: false, run: null }).state).toBe('scheduled');
    expect(classifyBackupDay({ ...base, now: new Date('2026-11-22T05:30:00.000Z'), hasVerifiedBackup: false, run: null }).state).toBe('scheduled');
    expect(classifyBackupDay({ ...base, now: new Date('2026-11-22T06:00:01.000Z'), hasVerifiedBackup: false, run: null }))
      .toEqual({ state: 'missed', canRetry: true });
  });

  it('reports configuration errors instead of missed when the secret is absent', () => {
    const broken = describeScheduler('production', false);
    expect(classifyBackupDay({ ...base, scheduler: broken, now: new Date('2026-11-22T10:00:00.000Z'), hasVerifiedBackup: false, run: null }))
      .toEqual({ state: 'not_configured', canRetry: true });
    expect(classifyBackupDay({ ...base, scheduler: broken, now: new Date('2026-11-22T10:00:00.000Z'), hasVerifiedBackup: true, run: null }))
      .toEqual({ state: 'not_configured', canRetry: true });
  });
});

describe('scheduler description', () => {
  it('flags a missing production secret', () => {
    const info = describeScheduler('production', false);
    expect(info.status).toBe('configuration_error');
    expect(info.detail).toMatch(/CRON_SECRET/);
  });

  it('requires an external job on preview deployments', () => {
    const info = describeScheduler('preview', true);
    expect(info.mechanism).toBe('external');
    expect(info.status).toBe('external_required');
    expect(info.detail).toMatch(/Preview/);
  });

  it('marks local development as manual', () => {
    expect(describeScheduler('development', true).status).toBe('manual');
  });
});

describe('automatic retention', () => {
  it('keeps the newest three automatic archives and never touches manual or recovery ones', () => {
    const rows = [
      backup('new', '2026-11-22T04:05:00.000Z'),
      backup('yesterday', '2026-11-21T04:05:00.000Z'),
      backup('two-days', '2026-11-20T04:05:00.000Z'),
      backup('three-days', '2026-11-19T04:05:00.000Z'),
      backup('four-days', '2026-11-18T04:05:00.000Z'),
      backup('manual', '2026-11-22T09:00:00.000Z', 'backup'),
      backup('recovery', '2026-11-22T09:30:00.000Z', 'recovery'),
    ];
    expect(selectAutomaticBackupsToPrune(rows, 'new')).toEqual(['three-days', 'four-days']);
  });

  it('removes same-day duplicates even when they would fit inside the retention window', () => {
    const rows = [
      backup('new', '2026-11-22T05:00:00.000Z'),
      backup('duplicate', '2026-11-22T04:00:00.000Z'),
      backup('yesterday', '2026-11-21T04:05:00.000Z'),
      backup('two-days', '2026-11-20T04:05:00.000Z'),
    ];
    expect(selectAutomaticBackupsToPrune(rows, 'new')).toEqual(['duplicate']);
  });

  it('never returns the archive created by this run', () => {
    const rows = [
      backup('oldest', '2026-11-17T04:05:00.000Z'),
      backup('old', '2026-11-20T04:05:00.000Z'),
      backup('yesterday', '2026-11-21T04:05:00.000Z'),
      backup('keep', '2026-11-19T04:05:00.000Z'),
    ];
    const pruned = selectAutomaticBackupsToPrune(rows, 'keep');
    expect(pruned).not.toContain('keep');
    expect(pruned).toContain('oldest');
  });
});
