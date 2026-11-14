import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import {
  authorPayloadSchema,
  autoSlugFor,
  findSlugConflict,
  parseAuthorMutation,
  serializeAdminAuthor,
  uniqueAutoSlug,
} from '@/lib/author-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const params = req.nextUrl.searchParams;
  const query = (params.get('q') ?? '').trim().slice(0, 100);
  const status = params.get('status');
  const sort = params.get('sort') ?? 'updated';
  const all = params.get('all') === '1';

  const requestedPage = Number(params.get('page'));
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const requestedSize = Number(params.get('pageSize'));
  const pageSize = all ? 500 : Math.min(100, Math.max(1, Number.isFinite(requestedSize) && requestedSize > 0 ? Math.floor(requestedSize) : 20));

  const where: Prisma.BlogAuthorWhereInput = {};
  if (status === 'published') where.published = true;
  if (status === 'draft') where.published = false;
  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { role: { contains: query, mode: 'insensitive' } },
      { slug: { contains: query, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.BlogAuthorOrderByWithRelationInput[] =
    sort === 'name'
      ? [{ name: 'asc' }]
      : sort === 'posts'
        ? [{ posts: { _count: 'desc' } }, { name: 'asc' }]
        : [{ updatedAt: 'desc' }];

  const [authors, total, publishedCount, draftCount] = await Promise.all([
    prisma.blogAuthor.findMany({
      where,
      orderBy,
      skip: all ? undefined : (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { posts: true } } },
    }),
    prisma.blogAuthor.count({ where }),
    prisma.blogAuthor.count({ where: { published: true } }),
    prisma.blogAuthor.count({ where: { published: false } }),
  ]);

  const ids = authors.map((author) => author.id);
  const publishedByAuthor = ids.length
    ? await prisma.post.groupBy({
        by: ['authorId'],
        where: { authorId: { in: ids }, published: true },
        _count: { _all: true },
      })
    : [];
  const publishedMap = new Map(publishedByAuthor.map((row) => [row.authorId, row._count._all]));

  return NextResponse.json({
    ok: true,
    data: authors.map((author) =>
      serializeAdminAuthor(author, {
        postCount: author._count.posts,
        publishedPostCount: publishedMap.get(author.id) ?? 0,
      }),
    ),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    stats: { total: publishedCount + draftCount, published: publishedCount, draft: draftCount },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = authorPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid author details.', details: parsed.error.flatten() }, { status: 400 });
  }

  const mutation = parseAuthorMutation(parsed.data);
  if (!mutation.ok) return NextResponse.json({ ok: false, error: mutation.error }, { status: 400 });
  const value = mutation.value;

  let slug: string;
  if (value.slug) {
    const conflict = await findSlugConflict(prisma, value.slug);
    if (conflict) return NextResponse.json({ ok: false, error: conflict }, { status: 409 });
    slug = value.slug;
  } else {
    slug = await uniqueAutoSlug(prisma, autoSlugFor(value.name));
  }

  try {
    const author = await prisma.blogAuthor.create({
      data: {
        name: value.name,
        slug,
        email: value.email,
        role: value.role,
        shortBio: value.shortBio,
        extendedBio: value.extendedBio,
        profileImage: value.profileImage,
        website: value.website,
        expertiseJson: value.expertiseJson,
        socialsJson: value.socialsJson,
        published: value.published ?? true,
      },
    });

    await writeAuditLog({
      adminId: admin.id!,
      adminEmail: admin.email ?? 'admin',
      action: 'author.create',
      targetType: 'BlogAuthor',
      targetId: author.id,
      detail: { slug: author.slug, published: author.published },
    });

    return NextResponse.json({ ok: true, data: serializeAdminAuthor(author) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ ok: false, error: 'A profile already uses this slug.' }, { status: 409 });
    }
    throw error;
  }
}
