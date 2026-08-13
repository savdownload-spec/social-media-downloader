import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

const patchSchema = z.object({
  status:     z.enum(['LIVE', 'COMING_SOON', 'MAINTENANCE', 'DISABLED']).optional(),
  creditCost: z.number().int().min(0).optional(),
  freeLimit:  z.number().int().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 400 });

  const updated = await prisma.toolConfig.update({
    where: { slug: params.slug },
    data: parsed.data,
  });

  await writeAuditLog({
    adminId: admin.id!, adminEmail: admin.email!,
    action: 'tool.update', targetType: 'Tool', targetId: params.slug,
    detail: parsed.data as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, data: { ...updated, updatedAt: updated.updatedAt.toISOString(), createdAt: updated.createdAt.toISOString() } });
}
