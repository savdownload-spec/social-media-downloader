import crypto from 'crypto';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { list } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import {
  ALL_BACKUP_CATEGORIES,
  BACKUP_CATEGORIES,
  BACKUP_EXCLUSIONS,
  BACKUP_FORMAT_VERSION,
  type BackupCategory,
} from './catalog';

const MAX_ROWS_PER_MODEL = 50_000;
const MAX_MEDIA_FILE_BYTES = 10 * 1024 * 1024;
const MAX_MEDIA_TOTAL_BYTES = 30 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;

type JsonRecord = Record<string, unknown>;
type Delegate = { findMany(args?: unknown): Promise<JsonRecord[]> };

export type BackupManifest = {
  product: 'SavDown';
  formatVersion: number;
  createdAt: string;
  createdBy: string;
  type: 'backup' | 'recovery';
  selectedCategories: BackupCategory[];
  recordCounts: Record<string, number>;
  fileCount: number;
  media: Array<{ originalUrl: string; archivePath: string; storagePath: string; contentType: string; size: number }>;
  exclusions: string[];
  limits: { maxArchiveBytes: number; maxUncompressedBytes: number; maxRowsPerModel: number };
  warnings: string[];
};

export type BuiltBackup = { buffer: Buffer; manifest: BackupManifest; fileName: string; warnings: string[] };

const delegateOn = (client: unknown, name: string) => (client as Record<string, Delegate>)[name];
const delegate = (name: string) => delegateOn(prisma, name);
const safeFilePart = (value: string) => value.replace(/[^a-zA-Z0-9._/-]/g, '_').replace(/\.\./g, '_');
const contentTypeForPath = (value: string) => ({
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
}[path.extname(value).toLowerCase()] ?? 'application/octet-stream');

async function rowsWith(client: unknown, name: string, args?: unknown) {
  const result = await delegateOn(client, name).findMany({ ...(args as object ?? {}), take: MAX_ROWS_PER_MODEL + 1 });
  if (result.length > MAX_ROWS_PER_MODEL) {
    throw new Error(`${name} has more than ${MAX_ROWS_PER_MODEL.toLocaleString()} records. Narrow or archive old data before creating a serverless backup.`);
  }
  return result;
}

const rows = (name: string, args?: unknown) => rowsWith(prisma, name, args);

function redactedPaymentId(id: unknown) {
  return `restored-${crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 24)}`;
}

type ReadStep = { key: string; read: (client: unknown) => Promise<JsonRecord[]> };

function planReads(categories: Set<BackupCategory>): ReadStep[] {
  const plan: ReadStep[] = [];
  const add = (key: string, name: string, args?: unknown, transform?: (records: JsonRecord[]) => JsonRecord[]) => {
    plan.push({
      key,
      read: async (client) => {
        const records = await rowsWith(client, name, args);
        return transform ? transform(records) : records;
      },
    });
  };

  if (categories.has('content')) {
    add('posts', 'post');
    add('postRevisions', 'postRevision');
    add('blogAuthors', 'blogAuthor');
    add('authorSlugRedirect', 'authorSlugRedirect');
  }
  if (categories.has('users')) {
    add('users', 'user', { select: {
      id: true, name: true, email: true, emailVerified: true, image: true, role: true,
      jobTitle: true, company: true, bio: true, themePreference: true, createdAt: true, updatedAt: true,
    } });
  }
  if (categories.has('pricing')) {
    add('pricingSettings', 'adminSetting', { where: { key: 'pricing_config' } });
  }
  if (categories.has('credits_usage')) {
    add('creditTransactions', 'creditTransaction', { select: {
      id: true, userId: true, amount: true, kind: true, bucket: true, description: true,
      externalId: true, idempotencyKey: true, operationId: true, paymentId: true,
      planDelta: true, purchasedDelta: true, referralDelta: true, balanceAfter: true,
      planBalanceAfter: true, purchasedBalanceAfter: true, referralBalanceAfter: true,
      expiresAt: true, referralId: true, createdAt: true,
    } }, (records) => records.map((record) => ({ ...record, externalId: null, idempotencyKey: null })));
    add('downloads', 'download', undefined, (records) => records.map((record) => ({
      ...record, idempotencyKey: null, ipHash: null, userAgent: null,
    })));
    add('aiImageGenerations', 'aiImageGeneration');
    add('analyticsEvents', 'analyticsEvent', undefined, (records) => records.map((record) => ({ ...record, metaJson: null })));
    add('creditAllocations', 'creditAllocation');
    add('userCreditState', 'user', { select: {
      id: true, planCredits: true, planCreditsResetAt: true, purchasedCredits: true, referralCredits: true,
    } });
  }
  if (categories.has('billing')) {
    add('subscriptions', 'subscription', undefined, (records) => records.map((record) => ({
      ...record,
      stripeSubscriptionId: redactedPaymentId(record.id),
      safepaySubscriptionId: null,
    })));
    add('payments', 'payment', undefined, (records) => records.map((record) => ({
      ...record,
      providerPaymentId: redactedPaymentId(record.id),
      reference: null,
      metadata: null,
    })));
    add('userEntitlements', 'user', { select: { id: true, plan: true } });
  }
  if (categories.has('feedback')) {
    add('reviews', 'review');
    add('blogComments', 'blogComment');
  }
  if (categories.has('settings')) {
    add('adminSettings', 'adminSetting', { where: { key: { not: 'pricing_config' } } },
      (records) => records.filter((record) => !/(secret|token|password|api[_-]?key|private[_-]?key)/i.test(String(record.key))));
    add('toolConfigs', 'toolConfig');
  }
  if (categories.has('support')) {
    add('contactMessages', 'contactMessage');
    add('supportConversations', 'supportConversation', undefined,
      (records) => records.map(({ guestTokenHash: _secret, ...record }) => record));
    add('supportMessages', 'supportMessage');
    add('supportAttachments', 'supportAttachment', { select: {
      id: true, messageId: true, fileName: true, contentType: true, size: true, createdAt: true,
    } });
  }
  if (categories.has('audience')) {
    add('newsletterSubscribers', 'newsletterSubscriber', undefined, (records) => records.map((record) => ({
      ...record, providerSubscriberId: null, providerListId: null,
    })));
    add('affiliates', 'affiliate');
    add('referrals', 'referral');
  }

  return plan;
}

/**
 * Reads every selected model inside one RepeatableRead transaction so a record
 * changed mid-export cannot produce a partially updated snapshot. Hosts
 * without `$transaction` (unit tests) fall back to plain sequential reads.
 */
async function collectData(categories: Set<BackupCategory>) {
  const plan = planReads(categories);
  const readAll = async (client: unknown) => {
    const data: Record<string, JsonRecord[]> = {};
    for (const step of plan) data[step.key] = await step.read(client);
    return data;
  };

  const transaction = (prisma as unknown as { $transaction?: unknown }).$transaction;
  if (typeof transaction !== 'function') return readAll(prisma);
  return (prisma as unknown as {
    $transaction: (
      fn: (client: unknown) => Promise<Record<string, JsonRecord[]>>,
      options: { isolationLevel: 'RepeatableRead'; maxWait: number; timeout: number },
    ) => Promise<Record<string, JsonRecord[]>>;
  }).$transaction((client) => readAll(client), {
    isolationLevel: 'RepeatableRead',
    maxWait: 20_000,
    timeout: 240_000,
  });
}

function discoverReferencedMedia(data: Record<string, JsonRecord[]>) {
  const references = new Set<string>();
  const pattern = /https?:\/\/[^\s"'<>\\)]+|\/images\/(?:blog\/uploads|avatars)\/[^\s"'<>\\)]+/g;
  const visit = (value: unknown) => {
    if (typeof value === 'string') for (const match of value.match(pattern) ?? []) references.add(match.replace(/[.,;]+$/, ''));
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(data);
  return references;
}

function isManagedBlobUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return /^[a-z0-9-]+\.(public\.)?blob\.vercel-storage\.com$/.test(host)
      || /^[a-z0-9-]+\.vercel-storage\.com$/.test(host)
      || /^[a-z0-9-]+\.blob\.vercel\.app$/.test(host);
  } catch { return false; }
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : Promise.resolve([target]);
  }));
  return nested.flat();
}

type MediaSource = { originalUrl: string; storagePath: string; contentType: string; load: () => Promise<Buffer> };

function usablePublicBlobToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  // A pasted public key or multi-line value is not a token; sending it as a
  // Bearer header throws, so only token-shaped values are used.
  if (token && !/-----BEGIN/.test(token) && !/\s/.test(token)) return token;
  return undefined;
}

async function collectMediaSources(data: Record<string, JsonRecord[]>, includeAll: boolean): Promise<{ sources: MediaSource[]; warnings: string[] }> {
  const byUrl = new Map<string, MediaSource>();
  const warnings: string[] = [];
  const references = discoverReferencedMedia(data);

  const publicToken = usablePublicBlobToken();
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim() && !publicToken) {
    warnings.push('BLOB_READ_WRITE_TOKEN is not a valid token, so unreferenced remote media was skipped. Referenced media is still included; fix the token to include every stored file.');
  }
  if (publicToken && includeAll) {
    for (const prefix of ['blog/', 'avatars/']) {
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor, limit: 1000, token: publicToken });
        for (const blob of page.blobs) {
          byUrl.set(blob.url, {
            originalUrl: blob.url,
            storagePath: blob.pathname,
            contentType: contentTypeForPath(blob.pathname),
            load: async () => {
              const response = await fetch(blob.url, { cache: 'no-store' });
              if (!response.ok) throw new Error(`Could not read managed media ${blob.pathname}.`);
              return Buffer.from(await response.arrayBuffer());
            },
          });
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    }
  }

  for (const reference of references) {
    if (reference.startsWith('/images/blog/uploads/') || reference.startsWith('/images/avatars/')) {
      const relative = reference.replace(/^\/+/, '');
      const diskPath = path.join(process.cwd(), 'public', ...relative.split('/'));
      byUrl.set(reference, {
        originalUrl: reference, storagePath: relative,
        contentType: contentTypeForPath(reference),
        load: () => readFile(diskPath),
      });
    } else if (isManagedBlobUrl(reference) && !byUrl.has(reference)) {
      const url = new URL(reference);
      const storagePath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      byUrl.set(reference, {
        originalUrl: reference, storagePath, contentType: contentTypeForPath(storagePath),
        load: async () => {
          const response = await fetch(reference, { cache: 'no-store' });
          if (!response.ok) throw new Error(`Could not read managed media ${storagePath}.`);
          return Buffer.from(await response.arrayBuffer());
        },
      });
    }
  }

  if (includeAll && !publicToken) {
    for (const root of ['public/images/blog/uploads', 'public/images/avatars']) {
      for (const diskPath of await walk(path.join(process.cwd(), ...root.split('/')))) {
        const info = await stat(diskPath);
        if (!info.isFile()) continue;
        const relative = path.relative(path.join(process.cwd(), 'public'), diskPath).split(path.sep).join('/');
        const originalUrl = `/${relative}`;
        if (!byUrl.has(originalUrl)) byUrl.set(originalUrl, {
          originalUrl, storagePath: relative, contentType: contentTypeForPath(relative), load: () => readFile(diskPath),
        });
      }
    }
  }

  return { sources: [...byUrl.values()], warnings };
}

function portableReadme(manifest: BackupManifest) {
  const labels = BACKUP_CATEGORIES.filter((category) => manifest.selectedCategories.includes(category.id)).map((category) => `- ${category.label}`).join('\n');
  return `# SavDown backup\n\nFormat version: ${manifest.formatVersion}\nCreated: ${manifest.createdAt}\n\n## Included categories\n\n${labels}\n\n## Layout\n\n- manifest.json: machine-readable package metadata and exclusions\n- checksums.sha256: SHA-256 integrity checks for every payload file\n- database/schema.json: exported model/field map\n- database/data/*.json: portable JSON arrays\n- media/: managed files plus media/index.json mapping original references\n- content/support-attachments/: binary support attachments\n\n## Importing elsewhere\n\nJSON files can be mapped by stable IDs into a custom application. Blog records contain Markdown and optional Tiptap JSON. Categories and tags are embedded in each post. For WordPress, map posts to wp_posts, tags/categories to terms, SEO fields to the chosen SEO plugin, and upload media files before replacing their URLs. SavDown does not claim a universal one-click importer; the Admin restore workflow is the supported importer for this format.\n\n## Restore behavior\n\nSavDown validates paths, size limits, manifest version, and every checksum. Existing primary/unique keys are skipped rather than overwritten or deleted. A recovery point is required before import. Records with missing relationships are reported as skipped/errors.\n\n## Exclusions\n\n${manifest.exclusions.map((item) => `- ${item}`).join('\n')}\n`;
}

export async function buildBackup(options: {
  categories?: BackupCategory[];
  createdBy: string;
  type?: 'backup' | 'recovery';
  onProgress?: (phase: string, message: string, progress: number) => void;
}): Promise<BuiltBackup> {
  const selected = [...new Set(options.categories?.length ? options.categories : ALL_BACKUP_CATEGORIES)];
  const categories = new Set(selected);
  const progress = options.onProgress ?? (() => undefined);
  progress('database', 'Reading selected database records…', 10);
  const data = await collectData(categories);
  const zip = new JSZip();
  let uncompressedBytes = 0;
  const add = (name: string, value: string | Buffer) => {
    const bytes = typeof value === 'string' ? Buffer.byteLength(value) : value.length;
    uncompressedBytes += bytes;
    if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) throw new Error('Backup exceeds the 100 MB safe uncompressed serverless limit. Create smaller selective backups.');
    zip.file(name, value);
  };

  const recordCounts: Record<string, number> = {};
  const schema: Record<string, string[]> = {};
  for (const [name, records] of Object.entries(data)) {
    recordCounts[name] = records.length;
    schema[name] = records.length ? Object.keys(records[0]) : [];
    add(`database/data/${safeFilePart(name)}.json`, JSON.stringify(records, null, 2));
  }
  add('database/schema.json', JSON.stringify({ formatVersion: BACKUP_FORMAT_VERSION, models: schema }, null, 2));

  progress('media', 'Collecting managed media and attachments…', 40);
  const mediaIndex: BackupManifest['media'] = [];
  const buildWarnings: string[] = [];
  let mediaBytes = 0;
  const { sources, warnings: mediaWarnings } = await collectMediaSources(data, categories.has('media'));
  buildWarnings.push(...mediaWarnings);
  for (const [index, source] of sources.entries()) {
    const buffer = await source.load().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'unavailable';
      buildWarnings.push(`Media file skipped (${source.storagePath}): ${message}`);
      return null;
    });
    if (!buffer) continue;
    if (buffer.length > MAX_MEDIA_FILE_BYTES) {
      buildWarnings.push(`Media file skipped — exceeds 10 MB per-file limit: ${source.storagePath}`);
      continue;
    }
    mediaBytes += buffer.length;
    if (mediaBytes > MAX_MEDIA_TOTAL_BYTES) throw new Error('Selected media exceeds the 30 MB serverless backup limit. Create smaller category backups or archive media externally.');
    const archivePath = `media/uploads/${String(index + 1).padStart(5, '0')}-${path.basename(safeFilePart(source.storagePath))}`;
    add(archivePath, buffer);
    mediaIndex.push({ originalUrl: source.originalUrl, archivePath, storagePath: safeFilePart(source.storagePath), contentType: source.contentType, size: buffer.length });
  }

  if (categories.has('support') && data.supportAttachments?.length) {
    const attachmentDelegate = delegate('supportAttachment');
    const withData = await attachmentDelegate.findMany({ select: { id: true, data: true }, take: MAX_ROWS_PER_MODEL + 1 }) as unknown as Array<{ id: string; data: Uint8Array }>;
    for (const attachment of withData) add(`content/support-attachments/${safeFilePart(attachment.id)}`, Buffer.from(attachment.data));
  }
  add('media/index.json', JSON.stringify(mediaIndex, null, 2));

  const createdAt = new Date().toISOString();
  const manifest: BackupManifest = {
    product: 'SavDown', formatVersion: BACKUP_FORMAT_VERSION, createdAt,
    createdBy: options.createdBy, type: options.type ?? 'backup', selectedCategories: selected,
    recordCounts, fileCount: 0, media: mediaIndex, exclusions: BACKUP_EXCLUSIONS,
    limits: { maxArchiveBytes: MAX_ARCHIVE_BYTES, maxUncompressedBytes: MAX_UNCOMPRESSED_BYTES, maxRowsPerModel: MAX_ROWS_PER_MODEL },
    warnings: buildWarnings,
  };
  add('README.md', portableReadme(manifest));
  add('manifest.json', JSON.stringify(manifest, null, 2));

  const checksumLines: string[] = [];
  for (const name of Object.keys(zip.files).sort()) {
    if (zip.files[name].dir) continue;
    const content = await zip.files[name].async('nodebuffer');
    checksumLines.push(`${crypto.createHash('sha256').update(content).digest('hex')}  ${name}`);
  }
  add('checksums.sha256', `${checksumLines.join('\n')}\n`);
  manifest.fileCount = Object.values(zip.files).filter((entry) => !entry.dir).length;
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  // Refresh the manifest checksum after adding the final file count.
  const withoutManifest = checksumLines.filter((line) => !line.endsWith('  manifest.json'));
  const finalManifest = await zip.file('manifest.json')!.async('nodebuffer');
  withoutManifest.push(`${crypto.createHash('sha256').update(finalManifest).digest('hex')}  manifest.json`);
  zip.file('checksums.sha256', `${withoutManifest.sort((a, b) => a.slice(66).localeCompare(b.slice(66))).join('\n')}\n`);

  progress('packaging', 'Compressing and checksumming ZIP…', 75);
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  if (buffer.length > MAX_ARCHIVE_BYTES) throw new Error('Compressed backup exceeds the 50 MB serverless limit. Create smaller selective backups.');
  const date = createdAt.slice(0, 10);
  const time = createdAt.slice(11, 19).replace(/:/g, '');
  const suffix = options.type === 'recovery' ? '-recovery' : '';
  progress('storing', 'Saving backup to protected history…', 90);
  return { buffer, manifest, fileName: `savdown-backup-${date}-${time}${suffix}.zip`, warnings: buildWarnings };
}
