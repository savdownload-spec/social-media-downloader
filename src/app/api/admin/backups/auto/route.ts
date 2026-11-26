import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, PRIVATE_NO_STORE_HEADERS } from '@/lib/admin-auth';
import { runAutomaticBackup, type AutomaticBackupActor } from '@/lib/backup/automatic';
import { classifyCronCaller, verifyCronAuthorization } from '@/lib/backup/cron-auth';
import { BackupStorageConfigurationError } from '@/lib/backup/storage';
import type { BackupTrigger } from '@/lib/backup/schedule';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function cronRejection(request: NextRequest): NextResponse | null {
  const result = verifyCronAuthorization(request.headers.get('authorization'));
  if (result === 'ok') return null;
  if (result === 'missing-secret') {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET is not configured. Add it in Vercel environment variables so scheduled backups can run.' },
      { status: 503, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
  return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
}

async function create(actor: AutomaticBackupActor, trigger: BackupTrigger): Promise<NextResponse> {
  try {
    const result = await runAutomaticBackup(actor, { trigger });
    return NextResponse.json({ ok: true, data: result }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    // Do not log Blob URLs, SDK request details, tokens, or archive data.
    console.error('Automatic backup failed', error instanceof Error ? error.name : 'BackupError');
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Automatic backup failed.' },
      { status: error instanceof BackupStorageConfigurationError ? 503 : 500, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}

/**
 * Scheduled entry point. Vercel sends `Authorization: Bearer <CRON_SECRET>`
 * on the production deployment; an external scheduler uses the same header for
 * the Preview deployment. The daily row lock makes repeated calls idempotent.
 */
export async function GET(request: NextRequest) {
  const rejected = cronRejection(request);
  if (rejected) return rejected;
  return create({ id: 'system', email: 'system', automatic: true }, classifyCronCaller(request.headers.get('user-agent')));
}

/** Authorized admin retry / catch-up for today's UTC date. */
export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  return create({ id: auth.user.id, email: auth.user.email ?? 'admin', automatic: false }, 'admin');
}
