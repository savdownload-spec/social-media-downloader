import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const adminUser = session?.user as { id?: string; role?: string; email?: string };
  if (adminUser?.role !== 'ADMIN') return forbidden();

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' } },
      creditLedger:  { orderBy: { createdAt: 'desc' }, take: 30 },
      downloads:     { orderBy: { createdAt: 'desc' }, take: 20 },
      reviews:       { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!user) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true, data: user });
}

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suspend') }),
  z.object({ action: z.literal('restore') }),
  z.object({ action: z.literal('delete') }),
  z.object({ action: z.literal('changePlan'), plan: z.enum(['FREE', 'PRO', 'MAX', 'LIFETIME']) }),
  z.object({ action: z.literal('addCredits'), amount: z.number().int().positive(), reason: z.string().min(3) }),
  z.object({ action: z.literal('removeCredits'), amount: z.number().int().positive(), reason: z.string().min(3) }),
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const adminUser = session?.user as { id?: string; role?: string; email?: string };
  if (adminUser?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });

  const { action } = parsed.data;
  const ip = req.headers.get('x-forwarded-for') ?? undefined;

  if (action === 'suspend') {
    await prisma.user.update({ where: { id: params.id }, data: { role: 'SUSPENDED' } });
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'user.suspend', targetType: 'User', targetId: params.id, ip });
    return NextResponse.json({ ok: true, data: { message: 'User suspended' } });
  }

  if (action === 'restore') {
    await prisma.user.update({ where: { id: params.id }, data: { role: 'USER' } });
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'user.restore', targetType: 'User', targetId: params.id, ip });
    return NextResponse.json({ ok: true, data: { message: 'User restored' } });
  }

  if (action === 'delete') {
    await prisma.user.delete({ where: { id: params.id } });
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'user.delete', targetType: 'User', targetId: params.id, ip });
    return NextResponse.json({ ok: true, data: { message: 'User deleted' } });
  }

  if (action === 'changePlan') {
    await prisma.user.update({ where: { id: params.id }, data: { plan: parsed.data.plan } });
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'user.changePlan', targetType: 'User', targetId: params.id, detail: { plan: parsed.data.plan }, ip });
    return NextResponse.json({ ok: true, data: { message: `Plan changed to ${parsed.data.plan}` } });
  }

  if (action === 'addCredits') {
    const { amount, reason } = parsed.data;
    await prisma.$transaction([
      prisma.user.update({ where: { id: params.id }, data: { purchasedCredits: { increment: amount } } }),
      prisma.creditTransaction.create({ data: { userId: params.id, amount, kind: 'adjustment', bucket: 'purchased', description: reason } }),
    ]);
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'credit.add', targetType: 'User', targetId: params.id, detail: { amount, reason }, ip });
    return NextResponse.json({ ok: true, data: { message: `Added ${amount} credits` } });
  }

  if (action === 'removeCredits') {
    const { amount, reason } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: params.id }, select: { purchasedCredits: true } });
    const toRemove = Math.min(amount, user?.purchasedCredits ?? 0);
    await prisma.$transaction([
      prisma.user.update({ where: { id: params.id }, data: { purchasedCredits: { decrement: toRemove } } }),
      prisma.creditTransaction.create({ data: { userId: params.id, amount: -toRemove, kind: 'adjustment', bucket: 'purchased', description: reason } }),
    ]);
    await writeAuditLog({ adminId: adminUser.id!, adminEmail: adminUser.email!, action: 'credit.remove', targetType: 'User', targetId: params.id, detail: { amount: toRemove, reason }, ip });
    return NextResponse.json({ ok: true, data: { message: `Removed ${toRemove} credits` } });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
