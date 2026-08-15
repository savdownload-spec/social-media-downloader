import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readExportFile } from '@/lib/export/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

/**
 * Streams a completed export back to the admin. Always goes through this
 * authenticated proxy rather than handing out the raw storage URL, even
 * though the underlying Blob URL (when Vercel Blob is configured) already
 * carries an unguessable random suffix — this keeps access control
 * enforced server-side regardless of storage backend.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { role?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const { id } = await params;
  const job = await prisma.userExportJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ ok: false, error: 'Export not found' }, { status: 404 });
  if (job.status === 'EXPIRED' || (job.expiresAt && job.expiresAt < new Date())) {
    return NextResponse.json({ ok: false, error: 'This export has expired' }, { status: 410 });
  }
  if (job.status !== 'COMPLETED' || !job.fileUrl || !job.fileName) {
    return NextResponse.json({ ok: false, error: 'Export is not ready' }, { status: 409 });
  }

  const format = req.nextUrl.searchParams.get('format');
  const files = Array.isArray(job.filesJson) ? (job.filesJson as { format: string; name: string; url: string }[]) : [];
  const target = format ? files.find((f) => f.format === format) : null;
  const fileUrl = target?.url ?? job.fileUrl;
  const fileName = target?.name ?? job.fileName;

  const result = await readExportFile(fileUrl);
  let body: Buffer;
  if ('buffer' in result) {
    body = result.buffer;
  } else {
    const res = await fetch(result.redirect);
    if (!res.ok) return NextResponse.json({ ok: false, error: 'Stored file could not be retrieved' }, { status: 502 });
    body = Buffer.from(await res.arrayBuffer());
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(body.length),
      'Cache-Control': 'no-store',
    },
  });
}
