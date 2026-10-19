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
};

export type BuiltBackup = { buffer: Buffer; manifest: BackupManifest; fileName: string };

const delegate = (name: string) => (prisma as unknown as Record<string, Delegate>)[name];
const safeFilePart = (value: string) => value.replace(/[^a-zA-Z0-9._/-]/g, '_').replace(/\.\./g, '_');

async function rows(name: string, args?: unknown) {
  const result = await delegate(name).findMany({ ...(args as object ?? {}), take: MAX_ROWS_PER_MODEL + 1 });
  if (result.length > MAX_ROWS_PER_MODEL) {
    throw new Error(`${name} has more than ${MAX_ROWS_PER_MODEL.toLocaleString()} records. Narrow or archive old data before creating a serverless backup.`);
  }
  return result;
}

function redactedPaymentId(id: unknown) {
  return `restored-${crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 24)}`;
}

async function collectData(categories: Set<BackupCategory>) {
  const data: Record<string, JsonRecord[]> = {};

  if (categories.has('content')) {
    data.posts = await rows('post');
    data.postRevisions = await rows('postRevision');
  }
  if (categories.has('users')) {
    data.users = await rows('user', { select: {
      id: true, name: true, email: true, emailVerified: true, image: true, role: true,
      jobTitle: true, company: true, bio: true, themePreference: true, createdAt: true, updatedAt: true,
    } });
  }
  if (categories.has('pricing')) {
    data.pricingSettings = await rows('adminSetting', { where: { key: 'pricing_config' } });
  }
  if (categories.has('credits_usage')) {
    const [creditTransactions, downloads, aiImageGenerations, analyticsEvents, creditState] = await Promise.all([
      rows('creditTransaction', { select: {
        id: true, userId: true, amount: true, kind: true, bucket: true, description: true,
        externalId: true, idempotencyKey: true, operationId: true, paymentId: true,
        planDelta: true, purchasedDelta: true, balanceAfter: true, planBalanceAfter: true,
        purchasedBalanceAfter: true, createdAt: true,
      } }), rows('download'), rows('aiImageGeneration'), rows('analyticsEvent'),
      rows('user', { select: {
        id: true, planCredits: true, planCreditsResetAt: true, purchasedCredits: true,
      } }),
    ]);
    data.creditTransactions = creditTransactions.map((record) => ({
      ...record, externalId: null, idempotencyKey: null,
    }));
    data.downloads = downloads.map((record) => ({ ...record, idempotencyKey: null, ipHash: null, userAgent: null }));
    data.aiImageGenerations = aiImageGenerations;
    data.analyticsEvents = analyticsEvents.map((record) => ({ ...record, metaJson: null }));
    data.userCreditState = creditState;
  }
  if (categories.has('billing')) {
    const [subscriptions, payments, entitlementState] = await Promise.all([
      rows('subscription'), rows('payment'),
      rows('user', { select: { id: true, plan: true } }),
    ]);
    data.subscriptions = subscriptions.map((record) => ({
      ...record,
      stripeSubscriptionId: redactedPaymentId(record.id),
      safepaySubscriptionId: null,
    }));
    data.payments = payments.map((record) => ({
      ...record,
      providerPaymentId: redactedPaymentId(record.id),
      reference: null,
      metadata: null,
    }));
    data.userEntitlements = entitlementState;
  }
  if (categories.has('feedback')) {
    data.reviews = await rows('review');
    data.blogComments = await rows('blogComment');
  }
  if (categories.has('settings')) {
    const settings = await rows('adminSetting', { where: { key: { not: 'pricing_config' } } });
    data.adminSettings = settings.filter((record) => !/(secret|token|password|api[_-]?key|private[_-]?key)/i.test(String(record.key)));
    data.toolConfigs = await rows('toolConfig');
  }
  if (categories.has('support')) {
    data.contactMessages = await rows('contactMessage');
    data.supportConversations = (await rows('supportConversation')).map(({ guestTokenHash: _secret, ...record }) => record);
    data.supportMessages = await rows('supportMessage');
    const attachments = await rows('supportAttachment', { select: {
      id: true, messageId: true, fileName: true, contentType: true, size: true, createdAt: true,
    } });
    data.supportAttachments = attachments;
  }
  if (categories.has('audience')) {
    data.newsletterSubscribers = (await rows('newsletterSubscriber')).map((record) => ({
      ...record, providerSubscriberId: null, providerListId: null,
    }));
    data.affiliates = await rows('affiliate');
  }

  return data;
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

async function collectMediaSources(data: Record<string, JsonRecord[]>, includeAll: boolean): Promise<MediaSource[]> {
  const byUrl = new Map<string, MediaSource>();
  const references = discoverReferencedMedia(data);

  if (process.env.BLOB_READ_WRITE_TOKEN && includeAll) {
    for (const prefix of ['blog/', 'avatars/']) {
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        for (const blob of page.blobs) {
          byUrl.set(blob.url, {
            originalUrl: blob.url,
            storagePath: blob.pathname,
            contentType: blob.contentType || 'application/octet-stream',
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
        contentType: reference.endsWith('.webp') ? 'image/webp' : 'application/octet-stream',
        load: () => readFile(diskPath),
      });
    } else if (isManagedBlobUrl(reference) && !byUrl.has(reference)) {
      const url = new URL(reference);
      const storagePath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      byUrl.set(reference, {
        originalUrl: reference, storagePath, contentType: 'application/octet-stream',
        load: async () => {
          const response = await fetch(reference, { cache: 'no-store' });
          if (!response.ok) throw new Error(`Could not read managed media ${storagePath}.`);
          return Buffer.from(await response.arrayBuffer());
        },
      });
    }
  }

  if (includeAll && !process.env.BLOB_READ_WRITE_TOKEN) {
    for (const root of ['public/images/blog/uploads', 'public/images/avatars']) {
      for (const diskPath of await walk(path.join(process.cwd(), ...root.split('/')))) {
        const info = await stat(diskPath);
        if (!info.isFile()) continue;
        const relative = path.relative(path.join(process.cwd(), 'public'), diskPath).split(path.sep).join('/');
        const originalUrl = `/${relative}`;
        if (!byUrl.has(originalUrl)) byUrl.set(originalUrl, {
          originalUrl, storagePath: relative, contentType: 'application/octet-stream', load: () => readFile(diskPath),
        });
      }
    }
  }

  return [...byUrl.values()];
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
  let mediaBytes = 0;
  const sources = await collectMediaSources(data, categories.has('media'));
  for (const [index, source] of sources.entries()) {
    const buffer = await source.load().catch((error) => { throw new Error(`Media backup failed for ${source.originalUrl}: ${error instanceof Error ? error.message : 'unavailable'}`); });
    if (buffer.length > MAX_MEDIA_FILE_BYTES) throw new Error(`Managed media ${source.storagePath} exceeds the 10 MB per-file backup limit.`);
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
  const suffix = options.type === 'recovery' ? '-recovery' : '';
  progress('storing', 'Saving backup to protected history…', 90);
  return { buffer, manifest, fileName: `savdown-backup-${date}${suffix}.zip` };
}
