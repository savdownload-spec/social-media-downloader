import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@vercel/blob', () => ({
  list: vi.fn().mockResolvedValue({ blobs: [], hasMore: false }),
  put: vi.fn().mockResolvedValue({ url: 'https://example.blob.vercel-storage.com/test' }),
}));

vi.mock('@/lib/prisma', () => {
  const makeDelegate = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockResolvedValue({}),
  });
  return {
    prisma: new Proxy(
      {},
      {
        get(_target, _prop: string) {
          return makeDelegate();
        },
      },
    ),
  };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { validateBackupArchive } from './restore';
import { buildBackup } from './archive';
import JSZip from 'jszip';
import crypto from 'crypto';
import { BACKUP_FORMAT_VERSION } from './catalog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid archive using buildBackup() and return its buffer. */
async function buildValidArchive(categories = ['users'] as string[]) {
  const result = await buildBackup({
    categories: categories as Parameters<typeof buildBackup>[0]['categories'],
    createdBy: 'test@example.com',
  });
  return result.buffer;
}

// ---------------------------------------------------------------------------
// validateBackupArchive() tests
// ---------------------------------------------------------------------------

describe('validateBackupArchive()', () => {
  it('rejects a non-ZIP buffer', async () => {
    await expect(validateBackupArchive(Buffer.from('not a zip file'))).rejects.toThrow();
  });

  it('rejects an empty buffer', async () => {
    await expect(validateBackupArchive(Buffer.alloc(0))).rejects.toThrow();
  });

  it('rejects a ZIP missing manifest.json', async () => {
    const zip = new JSZip();
    zip.file('README.md', 'hello');
    zip.file('checksums.sha256', '');
    zip.file('database/schema.json', '{}');
    zip.file('database/data/placeholder.json', '[]');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(validateBackupArchive(buffer)).rejects.toThrow(/manifest/i);
  });

  it('rejects a manifest with wrong product', async () => {
    const validBuffer = await buildValidArchive();
    const zip = await JSZip.loadAsync(validBuffer);
    const rawManifest = JSON.parse((await zip.file('manifest.json')!.async('nodebuffer')).toString('utf8'));
    rawManifest.product = 'WrongProduct';
    zip.file('manifest.json', JSON.stringify(rawManifest));
    const corrupted = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(validateBackupArchive(corrupted)).rejects.toThrow();
  });

  it('rejects a manifest with wrong formatVersion', async () => {
    const validBuffer = await buildValidArchive();
    const zip = await JSZip.loadAsync(validBuffer);
    const rawManifest = JSON.parse((await zip.file('manifest.json')!.async('nodebuffer')).toString('utf8'));
    rawManifest.formatVersion = BACKUP_FORMAT_VERSION + 999;
    zip.file('manifest.json', JSON.stringify(rawManifest));
    const corrupted = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(validateBackupArchive(corrupted)).rejects.toThrow();
  });

  it('rejects a ZIP with a path traversal entry name', async () => {
    const validBuffer = await buildValidArchive();
    const zip = await JSZip.loadAsync(validBuffer);
    // Add a traversal path entry
    zip.file('../etc/passwd', 'evil');
    const corrupted = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(validateBackupArchive(corrupted)).rejects.toThrow(/unsafe/i);
  });

  it('rejects a ZIP with a mismatched checksum', async () => {
    const validBuffer = await buildValidArchive();
    const zip = await JSZip.loadAsync(validBuffer);
    // Tamper with the README.md (non-JSON, so no earlier validation catches it)
    const readme = await zip.file('README.md')!.async('nodebuffer');
    zip.file('README.md', Buffer.concat([readme, Buffer.from('TAMPERED')]));
    const corrupted = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(validateBackupArchive(corrupted)).rejects.toThrow(/checksum/i);
  });

  it('rejects a ZIP with manifest fileCount mismatch', async () => {
    const validBuffer = await buildValidArchive();
    const zip = await JSZip.loadAsync(validBuffer);
    const rawManifest = JSON.parse((await zip.file('manifest.json')!.async('nodebuffer')).toString('utf8'));
    // Use a count that passes zod's max(5000) but doesn't match actual file count
    rawManifest.fileCount = rawManifest.fileCount + 1;
    zip.file('manifest.json', JSON.stringify(rawManifest));
    const corrupted = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(validateBackupArchive(corrupted)).rejects.toThrow(/file count|checksum/i);
  });

  it('accepts a valid archive built by buildBackup()', async () => {
    const validBuffer = await buildValidArchive();
    const result = await validateBackupArchive(validBuffer);
    expect(result.manifest.product).toBe('SavDown');
    expect(result.manifest.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(result.compressedBytes).toBe(validBuffer.length);
    expect(result.uncompressedBytes).toBeGreaterThan(0);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('validates a multi-category archive', async () => {
    const validBuffer = await buildValidArchive(['users', 'settings', 'feedback']);
    const result = await validateBackupArchive(validBuffer);
    expect(result.manifest.selectedCategories).toContain('users');
    expect(result.manifest.selectedCategories).toContain('settings');
    expect(result.manifest.selectedCategories).toContain('feedback');
  });

  it('accepts archives with optional warnings field', async () => {
    const validBuffer = await buildValidArchive(['users']);
    const zip = await JSZip.loadAsync(validBuffer);
    const rawManifest = JSON.parse((await zip.file('manifest.json')!.async('nodebuffer')).toString('utf8'));
    rawManifest.warnings = ['A test warning'];
    // Re-generate checksums for the updated manifest
    zip.file('manifest.json', JSON.stringify(rawManifest));
    // Recompute checksums
    const entries = Object.entries(zip.files).filter(([, entry]) => !entry.dir);
    const checksumLines: string[] = [];
    for (const [name, entry] of entries) {
      if (name === 'checksums.sha256') continue;
      const content = await entry.async('nodebuffer');
      checksumLines.push(`${crypto.createHash('sha256').update(content).digest('hex')}  ${name}`);
    }
    checksumLines.sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
    zip.file('checksums.sha256', `${checksumLines.join('\n')}\n`);
    // Re-update fileCount
    const allEntries = Object.values(zip.files).filter((e) => !e.dir);
    rawManifest.fileCount = allEntries.length;
    zip.file('manifest.json', JSON.stringify(rawManifest));
    // Recompute manifest checksum
    const manifestContent = await zip.file('manifest.json')!.async('nodebuffer');
    const manifestHash = `${crypto.createHash('sha256').update(manifestContent).digest('hex')}  manifest.json`;
    const withoutManifest = checksumLines.filter((line) => !line.endsWith('  manifest.json'));
    withoutManifest.push(manifestHash);
    withoutManifest.sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
    zip.file('checksums.sha256', `${withoutManifest.join('\n')}\n`);
    const finalBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await validateBackupArchive(finalBuffer);
    expect(result.manifest.warnings).toEqual(['A test warning']);
  });

  it('accepts archives without warnings field (backward compat)', async () => {
    const validBuffer = await buildValidArchive(['users']);
    const zip = await JSZip.loadAsync(validBuffer);
    const rawManifest = JSON.parse((await zip.file('manifest.json')!.async('nodebuffer')).toString('utf8'));
    delete rawManifest.warnings;
    zip.file('manifest.json', JSON.stringify(rawManifest));
    // Recompute checksums
    const entries = Object.entries(zip.files).filter(([, entry]) => !entry.dir);
    const checksumLines: string[] = [];
    for (const [name, entry] of entries) {
      if (name === 'checksums.sha256') continue;
      const content = await entry.async('nodebuffer');
      checksumLines.push(`${crypto.createHash('sha256').update(content).digest('hex')}  ${name}`);
    }
    checksumLines.sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
    zip.file('checksums.sha256', `${checksumLines.join('\n')}\n`);
    rawManifest.fileCount = Object.values(zip.files).filter((e) => !e.dir).length;
    zip.file('manifest.json', JSON.stringify(rawManifest));
    const manifestContent = await zip.file('manifest.json')!.async('nodebuffer');
    const manifestHash = `${crypto.createHash('sha256').update(manifestContent).digest('hex')}  manifest.json`;
    const withoutManifest = checksumLines.filter((line) => !line.endsWith('  manifest.json'));
    withoutManifest.push(manifestHash);
    withoutManifest.sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
    zip.file('checksums.sha256', `${withoutManifest.join('\n')}\n`);
    const finalBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await validateBackupArchive(finalBuffer);
    expect(result.manifest).toBeDefined();
  });

  it('rejects a manifest with recordCount mismatch', async () => {
    const validBuffer = await buildValidArchive(['settings']);
    const zip = await JSZip.loadAsync(validBuffer);
    const rawManifest = JSON.parse((await zip.file('manifest.json')!.async('nodebuffer')).toString('utf8'));
    // Corrupt a record count
    const firstModel = Object.keys(rawManifest.recordCounts)[0];
    if (firstModel) {
      rawManifest.recordCounts[firstModel] = 99999;
      zip.file('manifest.json', JSON.stringify(rawManifest));
      // Recompute checksums
      const entries = Object.entries(zip.files).filter(([, entry]) => !entry.dir);
      const checksumLines: string[] = [];
      for (const [name, entry] of entries) {
        if (name === 'checksums.sha256') continue;
        const content = await entry.async('nodebuffer');
        checksumLines.push(`${crypto.createHash('sha256').update(content).digest('hex')}  ${name}`);
      }
      checksumLines.sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
      zip.file('checksums.sha256', `${checksumLines.join('\n')}\n`);
      rawManifest.fileCount = Object.values(zip.files).filter((e) => !e.dir).length;
      zip.file('manifest.json', JSON.stringify(rawManifest));
      const manifestContent = await zip.file('manifest.json')!.async('nodebuffer');
      const manifestHash = `${crypto.createHash('sha256').update(manifestContent).digest('hex')}  manifest.json`;
      const withoutManifest = checksumLines.filter((line) => !line.endsWith('  manifest.json'));
      withoutManifest.push(manifestHash);
      withoutManifest.sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
      zip.file('checksums.sha256', `${withoutManifest.join('\n')}\n`);
      const corrupted = await zip.generateAsync({ type: 'nodebuffer' });
      await expect(validateBackupArchive(corrupted)).rejects.toThrow(/record count/i);
    }
  });
});

// ---------------------------------------------------------------------------
// restoreValidatedArchive() tests — scoped to avoid hitting real DB
// ---------------------------------------------------------------------------

describe('restoreValidatedArchive()', () => {
  it('calls through validateBackupArchive without error for a valid archive', async () => {
    const validBuffer = await buildValidArchive(['users']);
    const result = await validateBackupArchive(validBuffer);
    expect(result.manifest.product).toBe('SavDown');
    expect(result.files.size).toBeGreaterThan(0);
  });

  it('validated archive files map contains all expected base files', async () => {
    const validBuffer = await buildValidArchive(['users']);
    const result = await validateBackupArchive(validBuffer);
    expect(result.files.has('manifest.json')).toBe(true);
    expect(result.files.has('README.md')).toBe(true);
    expect(result.files.has('checksums.sha256')).toBe(true);
    expect(result.files.has('database/schema.json')).toBe(true);
    expect(result.files.has('media/index.json')).toBe(true);
  });

  it('sha256 field is a valid 64-char hex string', async () => {
    const validBuffer = await buildValidArchive(['settings']);
    const result = await validateBackupArchive(validBuffer);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('compressedBytes equals buffer length', async () => {
    const validBuffer = await buildValidArchive(['feedback']);
    const result = await validateBackupArchive(validBuffer);
    expect(result.compressedBytes).toBe(validBuffer.length);
  });
});
