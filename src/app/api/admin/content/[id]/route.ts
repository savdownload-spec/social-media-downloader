import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

const updateSchema = z.object({
  title:     z.string().min(2).optional(),
  slug:      z.string().min(2).optional(),
  excerpt:   z.string().optional(),
  content:   z.string().min(1).optional(),
  author:    z.string().optional(),
  tagsJson:  z.string().optional(),
  published: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 400 });

  const existing = await prisma.post.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.published && !existing.published) data.publishedAt = new Date();
  if (parsed.data.published === false) data.publishedAt = null;

  const post = await prisma.post.update({ where: { id: params.id }, data });
  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'content.update', targetType: 'Post', targetId: params.id });

  return NextResponse.json({ ok: true, data: post });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  await prisma.post.delete({ where: { id: params.id } });
  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'content.delete', targetType: 'Post', targetId: params.id });

  return NextResponse.json({ ok: true, data: { message: 'Post deleted' } });
}
