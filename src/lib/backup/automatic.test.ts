import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type MockRun = Record<string, unknown> & {
  id: string;
  kind: string;
  dateKey: string | null;
  status: string;
  attempts: number;
};

const h = vi.hoisted(() => {
  const runs = new Map<string, MockRun>();
  let seq = 0;
  const flags = { failReads: false, failRunUpdate: false };

  const applyData = (row: MockRun, data: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(data)) {
      const increment = (value as { increment?: number } | null)?.increment;
      if (typeof increment === 'number') row[key] = Number(row[key] ?? 0) + increment;
      else row[key] = value;
    }
  };
  const findDaily = (kind: string, dateKey: string | null) =>
    [...runs.values()].find((row) => row.kind === kind && row.dateKey === dateKey) ?? null;

  const backupRun = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      if (findDaily(String(data.kind), (data.dateKey as string | null) ?? null)) {
        const error = new Error('Unique constraint failed') as Error & { code: string };
        error.code = 'P2002';
        throw error;
      }
      const row = { id: `run-${++seq}`, attempts: 1, ...data } as unknown as MockRun;
      runs.set(row.id, row);
      return row;
    }),
    findUnique: vi.fn(async ({ where }: { where: { kind_dateKey: { kind: string; dateKey: string } } }) =>
      findDaily(where.kind_dateKey.kind, where.kind_dateKey.dateKey)),
    updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (const row of runs.values()) {
        if (row.id !== where.id) continue;
        if ('status' in where && row.status !== where.status) continue;
        if ('attempts' in where && row.attempts !== where.attempts) continue;
        applyData(row, data);
        count += 1;
      }
      return { count };
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      if (flags.failRunUpdate) {
        flags.failRunUpdate = false;
        throw new Error('Execution record update failed');
      }
      const row = runs.get(where.id);
      if (!row) throw new Error('Run not found');
      applyData(row, data);
      return row;
    }),
    upsert: vi.fn(async ({ where, create, update }: {
      where: { kind_dateKey: { kind: string; dateKey: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const existing = findDaily(where.kind_dateKey.kind, where.kind_dateKey.dateKey);
      if (existing) { applyData(existing, update); return existing; }
      const row = { id: `run-${++seq}`, attempts: 1, ...create } as unknown as MockRun;
      runs.set(row.id, row);
      return row;
    }),
    findMany: vi.fn(async () => [...runs.values()]),
  };

  const readDelegate = {
    findMany: vi.fn(async () => {
      if (flags.failReads) throw new Error('Database read failed');
      return [];
    }),
  };

  return {
    runs,
    flags,
    backupRun,
    readDelegate,
    reset() {
      runs.clear();
      seq = 0;
      flags.failReads = false;
      flags.failRunUpdate = false;
      backupRun.create.mockClear();
      backupRun.updateMany.mockClear();
    },
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: new Proxy({}, {
    get(_target, property: string) {
      return property === 'backupRun' ? h.backupRun : h.readDelegate;
    },
  }),
}));

vi.mock('@/lib/admin', () => ({ writeAuditLog: vi.fn(async () => undefined) }));

vi.mock('@vercel/blob', () => ({
  list: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

let runAutomaticBackup: typeof import('./automatic')['runAutomaticBackup'];
let storage: typeof import('./storage');
let directory = '';

const SEED_IDS = {
  old18: '11111111-1111-1111-1111-111111111111',
  old19: '22222222-2222-2222-2222-222222222222',
  old20: '33333333-3333-3333-3333-333333333333',
  old21: '44444444-4444-4444-4444-444444444444',
  manual: '55555555-5555-5555-5555-555555555555',
  recovery: '66666666-6666-6666-6666-666666666666',
};

const NOW = new Date('2026-11-22T10:00:00.000Z');
const actor = { id: 'system', email: 'system', automatic: true };

const automaticBackups = async () => (await storage.listBackups()).filter((row) => row.type === 'automatic');

async function seedArchive(id: string, createdAt: string, type: 'automatic' | 'backup' | 'recovery') {
  const fileName = `${id}.zip`;
  await storage.storeBackupArchive(id, fileName, Buffer.from(`payload-${id}`));
  await storage.storeBackupMetadata(id, {
    id, type, fileName, size: 10, createdAt, createdBy: 'seed', categories: ['users'],
    recordCounts: { users: 0 }, fileCount: 1,
  });
}

beforeAll(async () => {
  directory = mkdtempSync(path.join(os.tmpdir(), 'savdown-backup-'));
  process.env.BACKUP_LOCAL_DIR = directory;
  delete process.env.VERCEL;
  delete process.env.BACKUP_BLOB_STORE_ID;
  delete process.env.BACKUP_BLOB_READ_WRITE_TOKEN;
  ({ runAutomaticBackup } = await import('./automatic'));
  storage = await import('./storage');
});

beforeEach(() => {
  h.reset();
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('runAutomaticBackup', () => {
  it('creates one verified archive, persists its checksum, and skips a repeat call', async () => {
    const first = await runAutomaticBackup(actor, { now: NOW, trigger: 'cron' });
    expect(first.skipped).toBe(false);
    expect(first.status).toBe('completed');
    expect(first.verification).not.toBeNull();
    expect(first.backup?.sha256).toBe(first.verification?.sha256);
    expect(first.downloadUrl).toBe(`/api/admin/backups/${first.backup?.id}/download`);

    const stored = await storage.readBackup(first.backup!.id);
    expect(stored.buffer.length).toBe(first.backup!.size);
    expect(stored.metadata.sha256).toBe(first.verification!.sha256);
    expect(await automaticBackups()).toHaveLength(1);

    const second = await runAutomaticBackup(actor, { now: new Date('2026-11-22T10:05:00.000Z'), trigger: 'external' });
    expect(second.skipped).toBe(true);
    expect(second.backup?.id).toBe(first.backup!.id);
    expect(await automaticBackups()).toHaveLength(1);
    expect(h.runs.size).toBe(1);
    expect([...h.runs.values()][0].status).toBe('COMPLETED');
  });

  it('turns concurrent invocations into a single daily archive', async () => {
    const results = await Promise.all([
      runAutomaticBackup(actor, { now: NOW, trigger: 'cron' }),
      runAutomaticBackup(actor, { now: NOW, trigger: 'external' }),
    ]);
    expect(await automaticBackups()).toHaveLength(1);
    expect(results.some((result) => result.status === 'completed')).toBe(true);
    expect(h.runs.size).toBe(1);
  });

  it('records a failure and allows a later retry to complete the same daily row', async () => {
    h.flags.failReads = true;
    await expect(runAutomaticBackup(actor, { now: NOW, trigger: 'cron' })).rejects.toThrow(/Database read failed/);
    const failed = [...h.runs.values()][0];
    expect(failed.status).toBe('FAILED');
    expect(failed.error).toMatch(/Database read failed/);
    expect(await automaticBackups()).toHaveLength(0);

    h.flags.failReads = false;
    const retry = await runAutomaticBackup(actor, { now: new Date('2026-11-22T10:30:00.000Z'), trigger: 'external' });
    expect(retry.status).toBe('completed');
    const completed = [...h.runs.values()][0];
    expect(completed.status).toBe('COMPLETED');
    expect(completed.attempts).toBe(2);
    expect(await automaticBackups()).toHaveLength(1);
  });

  it('keeps a verified archive when only execution bookkeeping fails', async () => {
    h.flags.failRunUpdate = true;
    const result = await runAutomaticBackup(actor, { now: NOW, trigger: 'cron' });
    expect(result.status).toBe('completed');
    expect(result.warnings.join(' ')).toMatch(/execution record/i);
    expect(await automaticBackups()).toHaveLength(1);

    const repaired = await runAutomaticBackup(actor, { now: new Date('2026-11-22T11:00:00.000Z'), trigger: 'external' });
    expect(repaired.skipped).toBe(true);
    expect([...h.runs.values()][0].status).toBe('COMPLETED');
    expect(await automaticBackups()).toHaveLength(1);
  });

  it('keeps the newest three automatic archives and never prunes manual or recovery archives', async () => {
    await seedArchive(SEED_IDS.old18, '2026-11-18T04:05:00.000Z', 'automatic');
    await seedArchive(SEED_IDS.old19, '2026-11-19T04:05:00.000Z', 'automatic');
    await seedArchive(SEED_IDS.old20, '2026-11-20T04:05:00.000Z', 'automatic');
    await seedArchive(SEED_IDS.old21, '2026-11-21T04:05:00.000Z', 'automatic');
    await seedArchive(SEED_IDS.manual, '2026-11-21T12:00:00.000Z', 'backup');
    await seedArchive(SEED_IDS.recovery, '2026-11-21T13:00:00.000Z', 'recovery');

    const result = await runAutomaticBackup(actor, { now: NOW, trigger: 'cron' });
    expect(result.status).toBe('completed');
    expect(result.pruned).toBe(2);

    const rows = await storage.listBackups();
    const automatic = rows.filter((row) => row.type === 'automatic');
    expect(automatic).toHaveLength(3);
    expect(automatic.map((row) => row.createdAt.slice(0, 10)).sort()).toEqual(['2026-11-20', '2026-11-21', '2026-11-22']);
    expect(rows.some((row) => row.id === SEED_IDS.manual)).toBe(true);
    expect(rows.some((row) => row.id === SEED_IDS.recovery)).toBe(true);
  });
});
