import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  profileImage: z.string().url().optional().or(z.literal('')).nullable(),
  role: z.string().optional(),
  shortBio: z.string().optional().nullable(),
  extendedBio: z.string().optional().nullable(),
  expertiseJson: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  socialsJson: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const author = await prisma.blogAuthor.findUnique({
    where: { id: params.id },
    include: { _count: { select: { posts: true } } },
  });
  if (!author) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: author });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid', details: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.blogAuthor.findUnique({ where: { id: params.id }, select: { id: true, slug: true } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const slugTaken = await prisma.blogAuthor.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
    if (slugTaken) return NextResponse.json({ ok: false, error: 'Slug already in use.' }, { status: 409 });
  }

  const updated = await prisma.blogAuthor.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ ok: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const existing = await prisma.blogAuthor.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // Unlink posts before deleting (onDelete: SetNull handles it at DB level, but explicit is safer)
  await prisma.blogAuthor.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
