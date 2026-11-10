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

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  profileImage: z.string().url().optional().or(z.literal('')),
  role: z.string().default('Author'),
  shortBio: z.string().optional(),
  extendedBio: z.string().optional(),
  expertiseJson: z.string().default('[]'),
  website: z.string().url().optional().or(z.literal('')),
  socialsJson: z.string().default('{}'),
});

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const authors = await prisma.blogAuthor.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { posts: true } } },
  });

  return NextResponse.json({ ok: true, data: authors });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid', details: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.blogAuthor.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (existing) return NextResponse.json({ ok: false, error: 'A blog author with this slug already exists.' }, { status: 409 });

  const author = await prisma.blogAuthor.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      profileImage: parsed.data.profileImage || null,
      role: parsed.data.role,
      shortBio: parsed.data.shortBio || null,
      extendedBio: parsed.data.extendedBio || null,
      expertiseJson: parsed.data.expertiseJson,
      website: parsed.data.website || null,
      socialsJson: parsed.data.socialsJson,
    },
  });

  return NextResponse.json({ ok: true, data: author }, { status: 201 });
}
