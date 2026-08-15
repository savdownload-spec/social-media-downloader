import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const revisions = await prisma.postRevision.findMany({
    where: { postId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, changeSummary: true, authorEmail: true, createdAt: true, snapshotJson: true },
  });

  return NextResponse.json({
    ok: true,
    data: revisions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  });
}
