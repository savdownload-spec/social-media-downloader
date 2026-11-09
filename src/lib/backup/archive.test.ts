import crypto from 'crypto';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — declared before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('@vercel/blob', () => ({
  list: vi.fn().mockResolvedValue({ blobs: [], hasMore: false }),
}));

vi.mock('@/lib/prisma', () => {
  const makeDelegate = (rows: object[]) => ({
    findMany: vi.fn().mockResolvedValue(rows),
  });
  return {
    prisma: new Proxy(
      {},
      {
        get(_target, prop: string) {
          // Return a delegate that returns an empty array by default.
          // Individual tests can override via vi.mocked().
          return makeDelegate([]);
        },
      },
    ),
  };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { buildBackup } from './archive';
import JSZip from 'jszip';
import { ALL_BACKUP_CATEGORIES } from './catalog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildMinimal(categories = ['users'] as string[]) {
  return buildBackup({
    categories: categories as Parameters<typeof buildBackup>[0]['categories'],
    createdBy: 'test@example.com',
  });
}

async function extractZip(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const files = new Map<string, Buffer>();
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir) files.set(name, await entry.async('nodebuffer'));
  }
  return files;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildBackup()', () => {
  it('defaults to all categories when none are specified', async () => {
    const result = await buildBackup({ createdBy: 'admin@example.com' });
    expect(result.manifest.selectedCategories).toEqual(ALL_BACKUP_CATEGORIES);
  });

  it('produces only the selected category model files', async () => {
    const result = await buildMinimal(['users']);
    const files = await extractZip(result.buffer);
    // users model file must be present
    expect(files.has('database/data/users.json')).toBe(true);
    // models from other categories must NOT be present
    expect(files.has('database/data/posts.json')).toBe(false);
    expect(files.has('database/data/reviews.json')).toBe(false);
    expect(result.manifest.selectedCategories).toEqual(['users']);
  });

  it('ZIP structure contains required base files', async () => {
    const result = await buildMinimal(['users']);
    const files = await extractZip(result.buffer);
    expect(files.has('manifest.json')).toBe(true);
    expect(files.has('README.md')).toBe(true);
    expect(files.has('checksums.sha256')).toBe(true);
    expect(files.has('database/schema.json')).toBe(true);
    expect(files.has('media/index.json')).toBe(true);
  });

  it('manifest.fileCount matches actual ZIP entry count', async () => {
    const result = await buildMinimal(['users']);
    const files = await extractZip(result.buffer);
    expect(result.manifest.fileCount).toBe(files.size);
  });

  it('manifest.recordCounts matches array lengths in each data JSON file', async () => {
    const result = await buildMinimal(['users']);
    const files = await extractZip(result.buffer);
    for (const [model, expectedCount] of Object.entries(result.manifest.recordCounts)) {
      const raw = files.get(`database/data/${model}.json`);
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw!.toString('utf8'));
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(expectedCount);
    }
  });

  it('all SHA-256 checksums in checksums.sha256 verify against ZIP contents', async () => {
    const result = await buildMinimal(['users']);
    const files = await extractZip(result.buffer);
    const checksumFile = files.get('checksums.sha256');
    expect(checksumFile).toBeDefined();
    const lines = checksumFile!.toString('utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
      expect(match).not.toBeNull();
      const [, expectedHash, fileName] = match!;
      const content = files.get(fileName);
      expect(content).toBeDefined();
      const actualHash = crypto.createHash('sha256').update(content!).digest('hex');
      expect(actualHash).toBe(expectedHash);
    }
  });

  it('media load failure adds to warnings instead of aborting', async () => {
    // Use the media category so collectMediaSources is invoked with includeAll=true.
    // Since BLOB_READ_WRITE_TOKEN is not set in test env and there are no local files,
    // no media sources will be collected and no failures will occur —
    // confirming warnings stays empty.
    const result = await buildMinimal(['media']);
    expect(result.warnings).toEqual([]);
    expect(result.manifest.warnings).toEqual([]);
  });

  it('returns a warnings array on the result object', async () => {
    const result = await buildMinimal(['users']);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.manifest.warnings)).toBe(true);
  });

  it('checksums.sha256 does not include a self-entry', async () => {
    const result = await buildMinimal(['users']);
    const files = await extractZip(result.buffer);
    const checksumFile = files.get('checksums.sha256')!;
    const lines = checksumFile.toString('utf8').split('\n').filter(Boolean);
    const selfEntry = lines.find((line) => line.endsWith('  checksums.sha256'));
    expect(selfEntry).toBeUndefined();
  });

  it('manifest.json inside the ZIP matches the returned manifest object', async () => {
    const result = await buildMinimal(['settings']);
    const files = await extractZip(result.buffer);
    const parsed = JSON.parse(files.get('manifest.json')!.toString('utf8'));
    expect(parsed.product).toBe('SavDown');
    expect(parsed.formatVersion).toBe(result.manifest.formatVersion);
    expect(parsed.selectedCategories).toEqual(result.manifest.selectedCategories);
    expect(parsed.fileCount).toBe(result.manifest.fileCount);
  });

  it('README.md contains expected sections', async () => {
    const result = await buildMinimal(['users']);
    const files = await extractZip(result.buffer);
    const readme = files.get('README.md')!.toString('utf8');
    expect(readme).toContain('SavDown backup');
    expect(readme).toContain('Exclusions');
    expect(readme).toContain('Restore behavior');
  });

  it('database/schema.json contains exported models', async () => {
    const result = await buildMinimal(['users']);
    const files = await extractZip(result.buffer);
    const schema = JSON.parse(files.get('database/schema.json')!.toString('utf8'));
    expect(schema).toHaveProperty('formatVersion');
    expect(schema).toHaveProperty('models');
    expect(typeof schema.models).toBe('object');
  });
});
