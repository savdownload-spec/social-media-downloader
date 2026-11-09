/**
 * Backup inspection script — item 11 of the backup-audit plan.
 *
 * Usage:
 *   npx tsx src/lib/backup/inspect.ts
 *
 * Requires the following env vars (set in .env.local or shell):
 *   BACKUP_BLOB_READ_WRITE_TOKEN or BACKUP_BLOB_STORE_ID   — private backup store
 *   DATABASE_URL                                            — use dev/preview DB, NOT production
 *
 * Tip: Load .env.local automatically with:
 *   node --env-file=.env.local -e "require('tsx/cjs')" src/lib/backup/inspect.ts
 *   OR set the env vars in your shell before running:
 *   set BACKUP_BLOB_READ_WRITE_TOKEN=xxx && npx tsx src/lib/backup/inspect.ts
 *
 * What it does:
 *   1. Lists all stored backup archives via listBackups().
 *   2. For each backup, downloads and validates the archive (checksums, manifest, ZIP structure).
 *   3. Prints per-archive summaries: id, createdAt, selectedCategories, recordCounts,
 *      fileCount, mediaCount, warnings, compressedBytes, uncompressedBytes, validation result.
 *   4. Compares manifest recordCounts against live DB record counts for each exported model.
 *   5. Reports whether each archived media file's originalUrl is still accessible.
 */

import { listBackups, readBackup } from './storage';
import { validateBackupArchive } from './restore';
import { prisma } from '@/lib/prisma';

const bytes = (value: number) =>
  value < 1024
    ? `${value} B`
    : value < 1024 ** 2
      ? `${(value / 1024).toFixed(1)} KB`
      : `${(value / 1024 ** 2).toFixed(1)} MB`;

const EXPORTABLE_MODELS: Record<string, string> = {
  users: 'user',
  posts: 'post',
  postRevisions: 'postRevision',
  pricingSettings: 'adminSetting',
  adminSettings: 'adminSetting',
  toolConfigs: 'toolConfig',
  contactMessages: 'contactMessage',
  supportConversations: 'supportConversation',
  supportMessages: 'supportMessage',
  supportAttachments: 'supportAttachment',
  newsletterSubscribers: 'newsletterSubscriber',
  affiliates: 'affiliate',
  referrals: 'referral',
  downloads: 'download',
  payments: 'payment',
  subscriptions: 'subscription',
  creditTransactions: 'creditTransaction',
  creditAllocations: 'creditAllocation',
  aiImageGenerations: 'aiImageGeneration',
  analyticsEvents: 'analyticsEvent',
  reviews: 'review',
  blogComments: 'blogComment',
};

type Delegate = { count(args?: unknown): Promise<number> };
const delegate = (name: string) =>
  (prisma as unknown as Record<string, Delegate>)[name];

async function getLiveCount(exportName: string): Promise<number | null> {
  const modelName = EXPORTABLE_MODELS[exportName];
  if (!modelName) return null;
  // pricingSettings and adminSettings both map to adminSetting — handled below.
  if (exportName === 'pricingSettings') {
    return delegate('adminSetting').count({ where: { key: 'pricing_config' } }).catch(() => null);
  }
  if (exportName === 'adminSettings') {
    return delegate('adminSetting')
      .count({ where: { key: { not: 'pricing_config' } } })
      .catch(() => null);
  }
  // userCreditState and userEntitlements are sub-selects of user — use user count as proxy.
  if (exportName === 'userCreditState' || exportName === 'userEntitlements') {
    return delegate('user').count().catch(() => null);
  }
  return delegate(modelName).count().catch(() => null);
}

async function checkMediaUrl(url: string): Promise<boolean> {
  if (url.startsWith('/')) {
    // Local dev relative path — skip connectivity check
    return true;
  }
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function inspectArchive(id: string, index: number, total: number): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Archive ${index + 1} of ${total}: ${id}`);
  console.log('='.repeat(70));

  let buffer: Buffer;
  let metadata: Awaited<ReturnType<typeof readBackup>>['metadata'];
  try {
    const result = await readBackup(id);
    buffer = result.buffer;
    metadata = result.metadata;
    console.log(`  File      : ${metadata.fileName}`);
    console.log(`  Created   : ${metadata.createdAt} by ${metadata.createdBy}`);
    console.log(`  Type      : ${metadata.type}`);
    console.log(`  Size      : ${bytes(buffer.length)} (stored)`);
  } catch (error) {
    console.error(`  ✗ Could not read archive: ${error instanceof Error ? error.message : error}`);
    return;
  }

  // Validate
  let validated: Awaited<ReturnType<typeof validateBackupArchive>> | null = null;
  try {
    validated = await validateBackupArchive(buffer);
    console.log(`  ✓ Validation: PASSED`);
  } catch (error) {
    console.error(`  ✗ Validation: FAILED — ${error instanceof Error ? error.message : error}`);
  }

  if (!validated) return;

  const manifest = validated.manifest;
  const totalRecords = Object.values(manifest.recordCounts).reduce((a, b) => a + b, 0);

  console.log(`\n  Categories      : ${manifest.selectedCategories.join(', ')}`);
  console.log(`  Format version  : ${manifest.formatVersion}`);
  console.log(`  File count      : ${manifest.fileCount}`);
  console.log(`  Total records   : ${totalRecords.toLocaleString()}`);
  console.log(`  Media files     : ${manifest.media.length}`);
  console.log(`  Compressed      : ${bytes(validated.compressedBytes)}`);
  console.log(`  Uncompressed    : ${bytes(validated.uncompressedBytes)}`);
  console.log(`  SHA-256         : ${validated.sha256.slice(0, 16)}...`);

  if (manifest.warnings && manifest.warnings.length > 0) {
    console.log(`\n  Warnings (${manifest.warnings.length}):`);
    for (const warning of manifest.warnings) console.log(`    ⚠  ${warning}`);
  } else {
    console.log(`  Warnings        : none`);
  }

  // Per-model record counts vs live DB
  console.log(`\n  Record counts (manifest vs live DB):`);
  for (const [model, count] of Object.entries(manifest.recordCounts)) {
    const liveCount = await getLiveCount(model);
    const liveStr = liveCount === null ? 'n/a' : liveCount.toLocaleString();
    const match = liveCount === null ? '' : count === liveCount ? ' ✓' : ` ⚠ MISMATCH (live: ${liveStr})`;
    console.log(`    ${model.padEnd(28)} ${String(count).padStart(6)} (live: ${liveStr})${match}`);
  }

  // Media URL accessibility
  if (manifest.media.length > 0) {
    console.log(`\n  Media file accessibility (sample up to 5):`);
    const sample = manifest.media.slice(0, 5);
    for (const item of sample) {
      const accessible = await checkMediaUrl(item.originalUrl);
      const archiveOk = validated.files.has(item.archivePath);
      const sizeOk = archiveOk && validated.files.get(item.archivePath)!.length === item.size;
      const status = `archive=${archiveOk && sizeOk ? '✓' : '✗'} url=${accessible ? '✓' : '✗'}`;
      console.log(`    ${status}  ${item.storagePath}`);
    }
    if (manifest.media.length > 5) {
      console.log(`    ... and ${manifest.media.length - 5} more media files`);
    }
  }
}

async function main() {
  console.log('SavDown Backup Inspector');
  console.log('========================\n');

  let backups: Awaited<ReturnType<typeof listBackups>>;
  try {
    backups = await listBackups();
  } catch (error) {
    console.error(`Could not list backups: ${error instanceof Error ? error.message : error}`);
    console.error('\nEnsure BACKUP_BLOB_READ_WRITE_TOKEN or BACKUP_BLOB_STORE_ID is set.');
    process.exit(1);
  }

  if (!backups.length) {
    console.log('No backups found in storage.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${backups.length} backup(s) in storage.`);

  for (let index = 0; index < backups.length; index++) {
    await inspectArchive(backups[index]!.id, index, backups.length);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Inspection complete.');
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
