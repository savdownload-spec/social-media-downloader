import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const sp     = req.nextUrl.searchParams;
  const type   = sp.get('type') ?? 'usage';
  const days   = parseInt(sp.get('days') ?? '30', 10);
  const format = sp.get('format') ?? 'json';

  const since = new Date(); since.setDate(since.getDate() - days);

  let data: unknown[] = [];
  let headers: string[] = [];

  if (type === 'usage') {
    const rows = await prisma.download.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, tool: true, platform: true, status: true, createdAt: true },
    });
    headers = ['id', 'tool', 'platform', 'status', 'createdAt'];
    data = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  } else if (type === 'users') {
    const rows = await prisma.user.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, plan: true, createdAt: true },
    });
    headers = ['id', 'name', 'email', 'role', 'plan', 'createdAt'];
    data = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  } else if (type === 'subscriptions') {
    const rows = await prisma.subscription.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    });
    headers = ['id', 'userEmail', 'plan', 'status', 'interval', 'currentPeriodEnd', 'createdAt'];
    data = rows.map((r) => ({
      id: r.id, userEmail: r.user.email, plan: r.plan, status: r.status,
      interval: r.interval, currentPeriodEnd: r.currentPeriodEnd?.toISOString() ?? '',
      createdAt: r.createdAt.toISOString(),
    }));
  } else if (type === 'credits') {
    const rows = await prisma.creditTransaction.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    });
    headers = ['id', 'userEmail', 'kind', 'bucket', 'amount', 'description', 'createdAt'];
    data = rows.map((r) => ({
      id: r.id, userEmail: r.user?.email ?? '', kind: r.kind, bucket: r.bucket,
      amount: r.amount, description: r.description ?? '', createdAt: r.createdAt.toISOString(),
    }));
  }

  if (format === 'csv') {
    const csv = [
      headers.join(','),
      ...(data as Record<string, unknown>[]).map((row) =>
        headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
      ),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ ok: true, data: { rows: data, total: data.length } });
}
