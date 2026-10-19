import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, PRIVATE_NO_STORE_HEADERS } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/admin';
import { BackupStorageConfigurationError, deleteBackup } from '@/lib/backup/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    await deleteBackup(params.id);
    await writeAuditLog({ adminId: auth.user.id, adminEmail: auth.user.email ?? 'admin', action: 'backup.delete', targetType: 'Backup', targetId: params.id });
    return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Could not delete backup.' },
      { status: error instanceof BackupStorageConfigurationError ? 503 : 404, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}
