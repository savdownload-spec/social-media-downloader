import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { parseExpertise, parseSocials } from '@/lib/author-profile';
import {
  authorPayloadSchema,
  findSlugConflict,
  parseAuthorMutation,
  serializeAdminAuthor,
} from '@/lib/author-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

type Admin = { id?: string; role?: string; email?: string };

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as Admin)?.role !== 'ADMIN') return forbidden();

  const author = await prisma.blogAuthor.findUnique({
    where: { id: params.id },
    include: { _count: { select: { posts: true } } },
  });
  if (!author) return NextResponse.json({ ok: false, error: 'Author not found.' }, { status: 404 });

  const publishedPostCount = await prisma.post.count({
    where: { authorId: author.id, published: true },
  });

  return NextResponse.json({
    ok: true,
    data: serializeAdminAuthor(author, {
      postCount: author._count.posts,
      publishedPostCount,
    }),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as Admin;
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = authorPayloadSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid author details.', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.blogAuthor.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Author not found.' }, { status: 404 });

  const input = parsed.data;
  const merged = {
    name: input.name ?? existing.name,
    slug: input.slug === undefined ? existing.slug : input.slug,
    email: input.email === undefined ? existing.email : input.email,
    role: input.role === undefined ? existing.role : input.role,
    shortBio: input.shortBio === undefined ? existing.shortBio : input.shortBio,
    extendedBio: input.extendedBio === undefined ? existing.extendedBio : input.extendedBio,
    profileImage: input.profileImage === undefined ? existing.profileImage : input.profileImage,
    website: input.website === undefined ? existing.website : input.website,
    expertise: input.expertise !== undefined ? input.expertise : parseExpertise(existing.expertiseJson),
    socials: input.socials !== undefined ? input.socials : parseSocials(existing.socialsJson),
    published: input.published,
    expertiseJson: input.expertiseJson,
    socialsJson: input.socialsJson,
  };

  const mutation = parseAuthorMutation(merged);
  if (!mutation.ok) return NextResponse.json({ ok: false, error: mutation.error }, { status: 400 });
  const value = mutation.value;
  const desiredSlug = value.slug ?? existing.slug;
  const slugChanged = desiredSlug !== existing.slug;

  if (slugChanged) {
    const conflict = await findSlugConflict(prisma, desiredSlug, existing.id);
    if (conflict) return NextResponse.json({ ok: false, error: conflict }, { status: 409 });
  }

  const previousRedirect = slugChanged
    ? await prisma.authorSlugRedirect.findUnique({
        where: { oldSlug: desiredSlug },
        select: { authorId: true },
      })
    : null;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (slugChanged) {
        // Reusing an old slug of the same author makes it canonical again.
        if (previousRedirect?.authorId === existing.id) {
          await tx.authorSlugRedirect.delete({ where: { oldSlug: desiredSlug } });
        }
        await tx.authorSlugRedirect.upsert({
          where: { oldSlug: existing.slug },
          update: { authorId: existing.id },
          create: { oldSlug: existing.slug, authorId: existing.id },
        });
      }

      return tx.blogAuthor.update({
        where: { id: existing.id },
        data: {
          name: value.name,
          slug: desiredSlug,
          email: value.email,
          role: value.role,
          shortBio: value.shortBio,
          extendedBio: value.extendedBio,
          profileImage: value.profileImage,
          website: value.website,
          expertiseJson: value.expertiseJson,
          socialsJson: value.socialsJson,
          published: value.published ?? existing.published,
        },
      });
    });

    const action =
      value.published !== undefined && value.published !== existing.published
        ? value.published
          ? 'author.publish'
          : 'author.unpublish'
        : 'author.update';

    await writeAuditLog({
      adminId: admin.id!,
      adminEmail: admin.email ?? 'admin',
      action,
      targetType: 'BlogAuthor',
      targetId: updated.id,
      detail: { slug: updated.slug, slugChanged, fields: Object.keys(input) },
    });

    return NextResponse.json({ ok: true, data: serializeAdminAuthor(updated) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ ok: false, error: 'A profile already uses this slug.' }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as Admin;
  if (admin?.role !== 'ADMIN') return forbidden();

  const existing = await prisma.blogAuthor.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, slug: true },
  });
  if (!existing) return NextResponse.json({ ok: false, error: 'Author not found.' }, { status: 404 });

  const [linkedPosts, legacyPosts] = await Promise.all([
    prisma.post.count({ where: { authorId: existing.id } }),
    prisma.post.count({
      where: { authorId: null, author: { equals: existing.name, mode: 'insensitive' } },
    }),
  ]);
  const postCount = linkedPosts + legacyPosts;

  const reassignTo = req.nextUrl.searchParams.get('reassignTo')?.trim() || '';
  const unassign = req.nextUrl.searchParams.get('unassign') === 'true';

  if (postCount > 0 && !reassignTo && !unassign) {
    return NextResponse.json(
      {
        ok: false,
        code: 'AUTHOR_HAS_POSTS',
        error: `This author is linked to ${postCount} ${postCount === 1 ? 'article' : 'articles'}. Reassign them or explicitly leave the articles unassigned before deleting.`,
        data: { postCount },
      },
      { status: 409 },
    );
  }

  let target: { id: string; name: string } | null = null;
  if (reassignTo) {
    if (reassignTo === existing.id) {
      return NextResponse.json({ ok: false, error: 'Choose a different author for reassignment.' }, { status: 400 });
    }
    target = await prisma.blogAuthor.findUnique({
      where: { id: reassignTo },
      select: { id: true, name: true },
    });
    if (!target) return NextResponse.json({ ok: false, error: 'Reassignment author not found.' }, { status: 400 });
  }

  let postsReassigned = 0;
  let postsUnassigned = 0;

  await prisma.$transaction(async (tx) => {
    if (target) {
      const result = await tx.post.updateMany({
        where: {
          OR: [
            { authorId: existing.id },
            { authorId: null, author: { equals: existing.name, mode: 'insensitive' } },
          ],
        },
        data: { authorId: target.id, author: target.name },
      });
      postsReassigned = result.count;
    } else if (unassign) {
      const result = await tx.post.updateMany({
        where: { authorId: existing.id },
        data: { authorId: null },
      });
      postsUnassigned = result.count;
    }

    await tx.blogAuthor.delete({ where: { id: existing.id } });
  });

  await writeAuditLog({
    adminId: admin.id!,
    adminEmail: admin.email ?? 'admin',
    action: 'author.delete',
    targetType: 'BlogAuthor',
    targetId: existing.id,
    detail: {
      slug: existing.slug,
      postCount,
      reassignedTo: target?.id ?? null,
      postsReassigned,
      postsUnassigned,
    },
  });

  return NextResponse.json({
    ok: true,
    data: { deleted: true, postsReassigned, postsUnassigned },
  });
}
