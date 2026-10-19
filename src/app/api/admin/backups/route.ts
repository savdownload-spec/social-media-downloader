import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, PRIVATE_NO_STORE_HEADERS } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/admin';
import { buildBackup } from '@/lib/backup/archive';
import { ALL_BACKUP_CATEGORIES, isBackupCategory } from '@/lib/backup/catalog';
import { listBackups, storeBackup, type BackupHistoryItem } from '@/lib/backup/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const createSchema = z.object({ categories: z.array(z.string()).min(1).max(ALL_BACKUP_CATEGORIES.length) }).strict();
const encoder = new TextEncoder();
const line = (value: unknown) => encoder.encode(`${JSON.stringify(value)}\n`);

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const history = await listBackups();
  return NextResponse.json({ ok: true, data: history }, { headers: PRIVATE_NO_STORE_HEADERS });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success || parsed.data.categories.some((value) => !isBackupCategory(value))) {
    return NextResponse.json({ ok: false, error: 'Choose one or more supported backup categories.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
  }

  const categories = [...new Set(parsed.data.categories)].filter(isBackupCategory);
  const id = crypto.randomUUID();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (phase: string, message: string, progress: number) => controller.enqueue(line({ phase, message, progress }));
      try {
        send('starting', 'Preparing secure backup…', 2);
        const built = await buildBackup({ categories, createdBy: auth.user.email ?? 'admin', onProgress: send });
        const metadata: BackupHistoryItem = {
          id, type: 'backup', fileName: built.fileName, size: built.buffer.length,
          createdAt: built.manifest.createdAt, createdBy: auth.user.email ?? 'admin', categories,
          recordCounts: built.manifest.recordCounts, fileCount: built.manifest.fileCount,
        };
        await storeBackup(id, built.fileName, built.buffer, metadata);
        await writeAuditLog({
          adminId: auth.user.id, adminEmail: auth.user.email ?? 'admin', action: 'backup.create',
          targetType: 'Backup', targetId: id,
          detail: { categories, recordCounts: built.manifest.recordCounts, fileCount: built.manifest.fileCount, size: built.buffer.length },
        });
        controller.enqueue(line({ phase: 'done', message: 'Backup ready to download', progress: 100, backup: { ...metadata, downloadUrl: `/api/admin/backups/${id}/download` } }));
      } catch (error) {
        console.error('Admin backup failed', error);
        controller.enqueue(line({ phase: 'error', message: error instanceof Error ? error.message : 'Backup failed.' }));
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', ...PRIVATE_NO_STORE_HEADERS } });
}
