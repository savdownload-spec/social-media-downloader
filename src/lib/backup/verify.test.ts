import crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/blob', () => ({
  list: vi.fn().mockResolvedValue({ blobs: [], hasMore: false }),
  get: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  const makeDelegate = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockResolvedValue({}),
  });
  return {
    prisma: new Proxy({}, { get: () => makeDelegate() }),
  };
});

import { buildBackup } from './archive';
import { BackupVerificationError, sha256Of, verifyArchiveBuffer } from './verify';

async function buildArchive() {
  const built = await buildBackup({ categories: ['users'], createdBy: 'test@example.com' });
  return built.buffer;
}

describe('verifyArchiveBuffer', () => {
  it('opens the ZIP, validates every checksum, and reports counts', async () => {
    const buffer = await buildArchive();
    const sha256 = sha256Of(buffer);
    const result = await verifyArchiveBuffer(buffer, sha256);
    expect(result.sha256).toBe(sha256);
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.recordCount).toBeGreaterThanOrEqual(0);
  });

  it('rejects an archive whose digest changed', async () => {
    const buffer = await buildArchive();
    const wrong = crypto.createHash('sha256').update('different').digest('hex');
    await expect(verifyArchiveBuffer(buffer, wrong)).rejects.toBeInstanceOf(BackupVerificationError);
  });

  it('rejects data that is not a readable ZIP', async () => {
    await expect(verifyArchiveBuffer(Buffer.from('not a zip'))).rejects.toBeInstanceOf(BackupVerificationError);
  });
});
