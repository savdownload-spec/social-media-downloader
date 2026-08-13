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
  const pageSize = Math.min(50, parseInt(sp.get('pageSize') ?? '20', 10));
  const status   = sp.get('status') ?? ''; // published | draft
  const search   = sp.get('search')?.trim() ?? '';

  const where: Record<string, unknown> = {};
  if (status === 'published') where.published = true;
  if (status === 'draft')     where.published = false;
  if (search) where.OR = [
    { title:   { contains: search, mode: 'insensitive' } },
    { excerpt: { contains: search, mode: 'insensitive' } },
  ];

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, slug: true, title: true, author: true, published: true, publishedAt: true, tagsJson: true, createdAt: true, updatedAt: true },
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      posts: posts.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        publishedAt: p.publishedAt?.toISOString() ?? null,
      })),
      total, page, totalPages: Math.ceil(total / pageSize),
    },
  });
}

const postSchema = z.object({
  title:    z.string().min(2),
  slug:     z.string().min(2),
  excerpt:  z.string().optional(),
  content:  z.string().min(1),
  author:   z.string().default('Editorial Team'),
  tagsJson: z.string().default('[]'),
  published: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid', details: parsed.error.flatten() }, { status: 400 });

  const post = await prisma.post.create({
    data: { ...parsed.data, publishedAt: parsed.data.published ? new Date() : null },
  });

  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'content.create', targetType: 'Post', targetId: post.id });
  return NextResponse.json({ ok: true, data: post }, { status: 201 });
}
