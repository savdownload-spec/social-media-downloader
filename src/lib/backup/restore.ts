import crypto from 'crypto';
import { access, mkdir, writeFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { list, put } from '@vercel/blob';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ALL_BACKUP_CATEGORIES, BACKUP_FORMAT_VERSION, isBackupCategory, type BackupCategory } from './catalog';
import type { BackupManifest } from './archive';

const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_FILES = 5_000;
const MAX_COMPRESSION_RATIO = 40;
const MAX_ROWS = 50_000;

const CATEGORY_MODELS: Record<BackupCategory, string[]> = {
  content: ['posts', 'postRevisions'],
  media: [],
  users: ['users'],
  pricing: ['pricingSettings'],
  credits_usage: ['creditTransactions', 'creditAllocations', 'downloads', 'aiImageGenerations', 'analyticsEvents', 'userCreditState'],
  billing: ['subscriptions', 'payments', 'userEntitlements'],
  feedback: ['reviews', 'blogComments'],
  settings: ['adminSettings', 'toolConfigs'],
  support: ['contactMessages', 'supportConversations', 'supportMessages', 'supportAttachments'],
  audience: ['newsletterSubscribers', 'affiliates', 'referrals'],
};

type JsonRecord = Record<string, unknown>;
type MutableDelegate = {
  createMany(args: { data: JsonRecord[]; skipDuplicates: boolean }): Promise<{ count: number }>;
  findMany(args: unknown): Promise<JsonRecord[]>;
  update(args: unknown): Promise<unknown>;
};

const delegate = (name: string) => (prisma as unknown as Record<string, MutableDelegate>)[name];

const manifestSchema = z.object({
  product: z.literal('SavDown'),
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1).max(320),
  type: z.enum(['backup', 'recovery']),
  selectedCategories: z.array(z.string()).min(1).max(ALL_BACKUP_CATEGORIES.length),
  recordCounts: z.record(z.number().int().nonnegative()),
  fileCount: z.number().int().positive().max(MAX_FILES),
  media: z.array(z.object({
    originalUrl: z.string().max(4096), archivePath: z.string().max(512), storagePath: z.string().max(512),
    contentType: z.string().max(200), size: z.number().int().nonnegative().max(10 * 1024 * 1024),
  })).max(MAX_FILES),
  exclusions: z.array(z.string()).max(100),
  limits: z.object({ maxArchiveBytes: z.number(), maxUncompressedBytes: z.number(), maxRowsPerModel: z.number() }),
});

export type ValidatedArchive = {
  manifest: BackupManifest;
  files: Map<string, Buffer>;
  sha256: string;
  compressedBytes: number;
  uncompressedBytes: number;
};

function safeArchivePath(name: string) {
  if (!name || name.length > 512 || name.includes('\\') || name.includes('\0') || name.startsWith('/') || /^[A-Za-z]:/.test(name)) return false;
  const normalized = path.posix.normalize(name);
  return normalized === name && !normalized.startsWith('../') && !normalized.includes('/../');
}

export async function validateBackupArchive(buffer: Buffer): Promise<ValidatedArchive> {
  if (!buffer.length || buffer.length > MAX_ARCHIVE_BYTES) throw new Error('ZIP must be between 1 byte and 50 MB.');
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(buffer, { checkCRC32: true, createFolders: false }); }
  catch { throw new Error('The file is not a valid ZIP archive or its CRC checks failed.'); }

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length < 4 || entries.length > MAX_FILES) throw new Error(`Archive must contain between 4 and ${MAX_FILES} files.`);
  const files = new Map<string, Buffer>();
  let uncompressedBytes = 0;
  for (const entry of entries) {
    const unsafeOriginalName = (entry as JSZip.JSZipObject & { unsafeOriginalName?: string }).unsafeOriginalName;
    if (!safeArchivePath(entry.name) || (unsafeOriginalName && !safeArchivePath(unsafeOriginalName))) throw new Error(`Unsafe archive path: ${unsafeOriginalName || entry.name}`);
    if (files.has(entry.name)) throw new Error(`Duplicate archive path: ${entry.name}`);
    const content = await entry.async('nodebuffer');
    uncompressedBytes += content.length;
    if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) throw new Error('Archive expands beyond the 100 MB safety limit.');
    files.set(entry.name, content);
  }
  if (uncompressedBytes / Math.max(buffer.length, 1) > MAX_COMPRESSION_RATIO) throw new Error('Archive compression ratio exceeds the ZIP-bomb safety limit.');

  const rawManifest = files.get('manifest.json');
  const rawChecksums = files.get('checksums.sha256');
  const readme = files.get('README.md');
  if (!rawManifest || !rawChecksums || !readme) throw new Error('Archive must include manifest.json, README.md, and checksums.sha256.');
  let manifestValue: unknown;
  try { manifestValue = JSON.parse(rawManifest.toString('utf8')); }
  catch { throw new Error('manifest.json is not valid JSON.'); }
  const parsed = manifestSchema.safeParse(manifestValue);
  if (!parsed.success) throw new Error(`Unsupported or invalid manifest: ${parsed.error.issues[0]?.message ?? 'validation failed'}`);
  if (parsed.data.selectedCategories.some((value) => !isBackupCategory(value))) throw new Error('Manifest contains an unsupported backup category.');
  if (parsed.data.fileCount !== entries.length) throw new Error('Manifest file count does not match archive contents.');
  const allowedModels = new Set(parsed.data.selectedCategories.flatMap((value) => CATEGORY_MODELS[value as BackupCategory]));
  for (const name of files.keys()) {
    if (['manifest.json', 'README.md', 'checksums.sha256'].includes(name)) continue;
    if (!/^(database|media|content)\//.test(name)) throw new Error(`Unsupported archive path: ${name}`);
  }
  for (const [model, expectedCount] of Object.entries(parsed.data.recordCounts)) {
    if (!allowedModels.has(model)) throw new Error(`Data model ${model} does not belong to the selected categories.`);
    const dataFile = files.get(`database/data/${model}.json`);
    if (!dataFile) throw new Error(`Manifest references missing data file: ${model}.json`);
    let value: unknown;
    try { value = JSON.parse(dataFile.toString('utf8')); } catch { throw new Error(`${model}.json is not valid JSON.`); }
    if (!Array.isArray(value) || value.length > MAX_ROWS || value.length !== expectedCount) throw new Error(`Record count validation failed for ${model}.json.`);
  }
  for (const name of files.keys()) {
    const match = /^database\/data\/([a-zA-Z0-9_-]+)\.json$/.exec(name);
    if (match && !(match[1] in parsed.data.recordCounts)) throw new Error(`Data file ${match[1]}.json is missing from the manifest inventory.`);
  }

  const checksums = new Map<string, string>();
  for (const line of rawChecksums.toString('utf8').split(/\r?\n/).filter(Boolean)) {
    const match = /^([a-f0-9]{64})  (.+)$/i.exec(line);
    if (!match || !safeArchivePath(match[2]) || match[2] === 'checksums.sha256') throw new Error('checksums.sha256 has an invalid entry.');
    if (checksums.has(match[2])) throw new Error(`Duplicate checksum entry: ${match[2]}`);
    checksums.set(match[2], match[1].toLowerCase());
  }
  const payloadNames = [...files.keys()].filter((name) => name !== 'checksums.sha256').sort();
  if (checksums.size !== payloadNames.length) throw new Error('Checksum inventory does not match archive contents.');
  for (const name of payloadNames) {
    const expected = checksums.get(name);
    if (!expected) throw new Error(`Missing checksum for ${name}.`);
    const actual = crypto.createHash('sha256').update(files.get(name)!).digest('hex');
    if (actual !== expected) throw new Error(`Checksum validation failed for ${name}.`);
  }
  for (const media of parsed.data.media) {
    const content = files.get(media.archivePath);
    if (!content || content.length !== media.size) throw new Error(`Media inventory mismatch for ${media.archivePath}.`);
  }

  return {
    manifest: parsed.data as unknown as BackupManifest,
    files,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    compressedBytes: buffer.length,
    uncompressedBytes,
  };
}

const ALLOWED_FIELDS: Record<string, string[]> = {
  users: ['id', 'name', 'email', 'emailVerified', 'image', 'role', 'jobTitle', 'company', 'bio', 'themePreference', 'createdAt', 'updatedAt'],
  posts: ['id', 'slug', 'title', 'excerpt', 'content', 'coverImage', 'author', 'tagsJson', 'category', 'coverAlt', 'ogImage', 'primaryKeyword', 'secondaryKeywordsJson', 'canonicalUrl', 'toolSlug', 'readingTimeMinutes', 'published', 'publishedAt', 'createdAt', 'updatedAt', 'contentJson', 'seoTitle', 'metaDescription', 'focusKeyphrase', 'synonymsJson', 'noIndex', 'noFollow', 'metaRobotsAdvanced', 'breadcrumbTitle', 'schemaType', 'faqJson', 'howToJson', 'ogTitle', 'ogDescription', 'scheduledAt', 'seoScore', 'readabilityScore', 'wordCount'],
  postRevisions: ['id', 'postId', 'snapshotJson', 'changeSummary', 'authorId', 'authorEmail', 'createdAt'],
  pricingSettings: ['key', 'value', 'updatedAt'], adminSettings: ['key', 'value', 'updatedAt'],
  toolConfigs: ['id', 'slug', 'name', 'category', 'status', 'creditCost', 'freeLimit', 'batchLimitFree', 'batchLimitPro', 'batchLimitMax', 'batchLimitLifetime', 'updatedAt', 'createdAt'],
  creditTransactions: ['id', 'userId', 'amount', 'kind', 'bucket', 'description', 'externalId', 'idempotencyKey', 'operationId', 'paymentId', 'planDelta', 'purchasedDelta', 'referralDelta', 'balanceAfter', 'planBalanceAfter', 'purchasedBalanceAfter', 'referralBalanceAfter', 'expiresAt', 'referralId', 'createdAt'],
  creditAllocations: ['id', 'referralId', 'spendTransactionId', 'amount', 'refundedAmount', 'createdAt'],
  downloads: ['id', 'platform', 'tool', 'sourceUrl', 'status', 'idempotencyKey', 'batchId', 'failureReason', 'failureCode', 'creditCost', 'userId', 'ipHash', 'userAgent', 'createdAt', 'updatedAt', 'completedAt'],
  aiImageGenerations: ['id', 'userId', 'operationId', 'prompt', 'aspectRatio', 'quality', 'model', 'numberOfImages', 'creditsUsed', 'status', 'failureReason', 'createdAt'],
  analyticsEvents: ['id', 'name', 'path', 'referrer', 'country', 'device', 'metaJson', 'createdAt'],
  subscriptions: ['id', 'userId', 'provider', 'stripeSubscriptionId', 'safepaySubscriptionId', 'stripePriceId', 'status', 'plan', 'interval', 'currentPeriodEnd', 'cancelAtPeriodEnd', 'createdAt', 'updatedAt'],
  payments: ['id', 'provider', 'providerPaymentId', 'userId', 'itemId', 'amount', 'currency', 'status', 'reference', 'subscriptionId', 'metadata', 'paidAt', 'refundedAt', 'createdAt', 'updatedAt'],
  reviews: ['id', 'userId', 'name', 'email', 'role', 'company', 'platform', 'rating', 'review', 'status', 'approved', 'featured', 'verified', 'sourceUrl', 'photo', 'approvedAt', 'createdAt', 'updatedAt'],
  blogComments: ['id', 'postSlug', 'userId', 'body', 'status', 'reportReason', 'reportedAt', 'approvedAt', 'moderatedAt', 'moderatedById', 'createdAt', 'updatedAt'],
  contactMessages: ['id', 'name', 'email', 'subject', 'message', 'createdAt'],
  supportConversations: ['id', 'userId', 'guestName', 'guestEmail', 'category', 'status', 'priority', 'assignedAdminId', 'lastMessagePreview', 'lastMessageAt', 'customerUnreadCount', 'adminUnreadCount', 'customerLastReadAt', 'adminLastReadAt', 'resolvedAt', 'createdAt', 'updatedAt'],
  supportMessages: ['id', 'conversationId', 'senderType', 'senderId', 'body', 'originalMessage', 'detectedLanguage', 'translatedMessage', 'translationStatus', 'internal', 'createdAt'],
  supportAttachments: ['id', 'messageId', 'fileName', 'contentType', 'size', 'createdAt', 'data'],
  newsletterSubscribers: ['id', 'email', 'active', 'createdAt', 'status', 'source', 'provider', 'providerSubscriberId', 'providerListId', 'subscribedAt', 'updatedAt'],
  affiliates: ['id', 'userId', 'code', 'commissionRate', 'status', 'totalClicks', 'totalSignups', 'totalConversions', 'totalRevenue', 'totalCommission', 'paidOut', 'createdAt', 'updatedAt'],
  referrals: ['id', 'affiliateId', 'referredUserId', 'code', 'status', 'rejectionReason', 'rewardCredits', 'remainingCredits', 'expiredCredits', 'estimatedUsdValue', 'createdAt', 'qualifiedAt', 'rewardedAt', 'expiresAt'],
  userCreditState: ['id', 'planCredits', 'planCreditsResetAt', 'purchasedCredits', 'referralCredits'],
  userEntitlements: ['id', 'plan'],
};

const DATE_FIELDS = new Set(['emailVerified', 'planCreditsResetAt', 'publishedAt', 'scheduledAt', 'reportedAt', 'approvedAt', 'moderatedAt', 'currentPeriodEnd', 'paidAt', 'refundedAt', 'lastMessageAt', 'customerLastReadAt', 'adminLastReadAt', 'resolvedAt', 'subscribedAt', 'completedAt', 'qualifiedAt', 'rewardedAt', 'expiresAt', 'createdAt', 'updatedAt']);

const IMPORT_ORDER: Array<[string, string]> = [
  ['users', 'user'], ['posts', 'post'], ['postRevisions', 'postRevision'],
  ['pricingSettings', 'adminSetting'], ['adminSettings', 'adminSetting'], ['toolConfigs', 'toolConfig'],
  ['contactMessages', 'contactMessage'], ['supportConversations', 'supportConversation'], ['supportMessages', 'supportMessage'], ['supportAttachments', 'supportAttachment'],
  ['newsletterSubscribers', 'newsletterSubscriber'], ['affiliates', 'affiliate'], ['referrals', 'referral'],
  ['downloads', 'download'], ['payments', 'payment'], ['subscriptions', 'subscription'],
  ['creditTransactions', 'creditTransaction'], ['creditAllocations', 'creditAllocation'], ['aiImageGenerations', 'aiImageGeneration'], ['analyticsEvents', 'analyticsEvent'],
  ['reviews', 'review'], ['blogComments', 'blogComment'],
];

function parseRecords(archive: ValidatedArchive, name: string): JsonRecord[] {
  const file = archive.files.get(`database/data/${name}.json`);
  if (!file) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(file.toString('utf8')); } catch { throw new Error(`${name}.json is not valid JSON.`); }
  if (!Array.isArray(parsed) || parsed.length > MAX_ROWS) throw new Error(`${name}.json must be an array of at most ${MAX_ROWS.toLocaleString()} records.`);
  const allowed = new Set(ALLOWED_FIELDS[name] ?? []);
  return parsed.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name}[${index}] must be an object.`);
    const source = value as JsonRecord;
    const clean: JsonRecord = {};
    for (const key of allowed) {
      if (!(key in source)) continue;
      const field = source[key];
      if (DATE_FIELDS.has(key) && field !== null) {
        const date = new Date(String(field));
        if (Number.isNaN(date.getTime())) throw new Error(`${name}[${index}].${key} is not a valid date.`);
        clean[key] = date;
      } else clean[key] = field;
    }
    return clean;
  });
}

async function safeCreateMany(model: string, records: JsonRecord[]) {
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  const create = async (batch: JsonRecord[]): Promise<void> => {
    if (!batch.length) return;
    try {
      const result = await delegate(model).createMany({ data: batch, skipDuplicates: true });
      created += result.count;
      skipped += batch.length - result.count;
    } catch (error) {
      if (batch.length > 1) {
        const middle = Math.ceil(batch.length / 2);
        await create(batch.slice(0, middle));
        await create(batch.slice(middle));
      } else {
        skipped += 1;
        if (errors.length < 20) errors.push(error instanceof Error ? error.message.split('\n').pop() || 'Import failed' : 'Import failed');
      }
    }
  };
  for (let index = 0; index < records.length; index += 250) await create(records.slice(index, index + 250));
  return { created, skipped, errors };
}

async function restoreMedia(archive: ValidatedArchive) {
  const replacements = new Map<string, string>();
  let restored = 0;
  let skipped = 0;
  let existingBlobs = new Map<string, string>();
  if (archive.manifest.media.length && process.env.BLOB_READ_WRITE_TOKEN) {
    let cursor: string | undefined;
    do {
      const page = await list({ cursor, limit: 1000 });
      for (const blob of page.blobs) existingBlobs.set(blob.pathname, blob.url);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
  for (const item of archive.manifest.media) {
    const buffer = archive.files.get(item.archivePath)!;
    const storagePath = path.posix.normalize(item.storagePath).replace(/^\/+/, '');
    if (!/^(blog\/|avatars\/|images\/blog\/uploads\/|images\/avatars\/)/.test(storagePath) || storagePath.includes('../')) throw new Error(`Unsafe media target: ${item.storagePath}`);
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blobPath = storagePath.startsWith('images/blog/uploads/') ? storagePath.replace('images/blog/uploads/', 'blog/')
        : storagePath.startsWith('images/avatars/') ? storagePath.replace('images/avatars/', 'avatars/') : storagePath;
      const existing = existingBlobs.get(blobPath);
      if (existing) { replacements.set(item.originalUrl, existing); skipped += 1; continue; }
      const blob = await put(blobPath, buffer, { access: 'public', contentType: item.contentType, addRandomSuffix: false });
      replacements.set(item.originalUrl, blob.url); restored += 1;
    } else {
      if (process.env.VERCEL) throw new Error('Restore contains media but Vercel Blob is not configured.');
      const localRelative = storagePath.startsWith('blog/') ? `images/blog/uploads/${storagePath.slice(5)}`
        : storagePath.startsWith('avatars/') ? `images/avatars/${storagePath.slice(8)}` : storagePath;
      const target = path.join(process.cwd(), 'public', ...localRelative.split('/'));
      await mkdir(path.dirname(target), { recursive: true });
      try { await access(target); skipped += 1; }
      catch { await writeFile(target, buffer, { flag: 'wx' }); restored += 1; }
      replacements.set(item.originalUrl, `/${localRelative}`);
    }
  }
  return { replacements, restored, skipped };
}

function replaceMedia(value: unknown, replacements: Map<string, string>): unknown {
  if (typeof value === 'string') {
    let result = value;
    for (const [before, after] of replacements) result = result.split(before).join(after);
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => replaceMedia(item, replacements));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceMedia(item, replacements)]));
  }
  return value;
}

export type RestoreReport = {
  models: Record<string, { created: number; skipped: number; errors: string[] }>;
  media: { restored: number; skipped: number };
  totals: { created: number; skipped: number; errors: number };
};

export async function restoreValidatedArchive(archive: ValidatedArchive): Promise<RestoreReport> {
  const media = await restoreMedia(archive);
  const models: RestoreReport['models'] = {};
  const usersBefore = new Set<string>();
  const userRecords = parseRecords(archive, 'users');
  if (userRecords.length) {
    const ids = userRecords.map((record) => String(record.id)).filter(Boolean);
    const existing = await delegate('user').findMany({ where: { id: { in: ids } }, select: { id: true } });
    existing.forEach((record) => usersBefore.add(String(record.id)));
  }

  for (const [name, model] of IMPORT_ORDER) {
    let records = parseRecords(archive, name);
    if (name === 'supportAttachments') {
      records = records.map((record) => {
        const data = archive.files.get(`content/support-attachments/${String(record.id)}`);
        if (!data) throw new Error(`Missing support attachment payload for ${String(record.id)}.`);
        return { ...record, data };
      });
    }
    records = records.map((record) => replaceMedia(record, media.replacements) as JsonRecord);
    if (records.length) models[name] = await safeCreateMany(model, records);
  }

  const newlyCreatedUsers = new Set(userRecords.map((record) => String(record.id)).filter((id) => !usersBefore.has(id)));
  for (const [name, fields] of [['userCreditState', ['planCredits', 'planCreditsResetAt', 'purchasedCredits', 'referralCredits']], ['userEntitlements', ['plan']]] as const) {
    const records = parseRecords(archive, name);
    let created = 0; let skipped = 0; const errors: string[] = [];
    for (const record of records) {
      const id = String(record.id ?? '');
      if (!newlyCreatedUsers.has(id)) { skipped += 1; continue; }
      const data = Object.fromEntries(fields.filter((field) => field in record).map((field) => [field, record[field]]));
      try { await delegate('user').update({ where: { id }, data }); created += 1; }
      catch (error) { skipped += 1; if (errors.length < 20) errors.push(error instanceof Error ? error.message : 'State update failed'); }
    }
    if (records.length) models[name] = { created, skipped, errors };
  }

  const totals = Object.values(models).reduce((sum, item) => ({
    created: sum.created + item.created,
    skipped: sum.skipped + item.skipped,
    errors: sum.errors + item.errors.length,
  }), { created: 0, skipped: media.skipped, errors: 0 });
  totals.created += media.restored;
  return { models, media: { restored: media.restored, skipped: media.skipped }, totals };
}
