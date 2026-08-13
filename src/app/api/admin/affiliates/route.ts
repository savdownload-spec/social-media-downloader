import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const sp       = req.nextUrl.searchParams;
  const page     = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const pageSize = Math.min(50, parseInt(sp.get('pageSize') ?? '25', 10));
  const status   = sp.get('status') ?? '';

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [affiliates, total] = await Promise.all([
    prisma.affiliate.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
    prisma.affiliate.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      affiliates: affiliates.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })),
      total, page, totalPages: Math.ceil(total / pageSize),
    },
  });
}

const patchSchema = z.object({
  action: z.enum(['approve', 'suspend']),
  id:     z.string(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 400 });

  const status = parsed.data.action === 'approve' ? 'ACTIVE' : 'SUSPENDED';
  await prisma.affiliate.update({ where: { id: parsed.data.id }, data: { status } });
  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: `affiliate.${parsed.data.action}`, targetType: 'Affiliate', targetId: parsed.data.id });

  return NextResponse.json({ ok: true, data: { message: `Affiliate ${parsed.data.action}d` } });
}
