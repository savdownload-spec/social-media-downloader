import { NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';
import { BackupStorageConfigurationError, readBackup } from '@/lib/backup/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const { buffer, metadata } = await readBackup(params.id);
    return new Response(new Uint8Array(buffer), { headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${metadata.fileName.replace(/[\r\n"]/g, '_')}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, no-store, max-age=0',
      Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    const configurationError = error instanceof BackupStorageConfigurationError;
    return new Response(configurationError ? error.message : 'Backup not found.', {
      status: configurationError ? 503 : 404,
      headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }
}
