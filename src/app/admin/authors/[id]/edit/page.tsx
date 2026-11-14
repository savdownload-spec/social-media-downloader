import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { AdminPage, PageHeader } from '@/components/admin/AdminUI';
import { AuthorForm } from '@/components/admin/authors/AuthorForm';
import { prisma } from '@/lib/prisma';
import { serializeAdminAuthor } from '@/lib/author-admin';

export const metadata = buildMetadata({
  title: 'Edit Author — Admin',
  description: 'Edit an author profile, social links, and publishing status.',
  path: '/admin/authors',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminEditAuthorPage({ params }: { params: { id: string } }) {
  const author = await prisma.blogAuthor.findUnique({
    where: { id: params.id },
    include: { _count: { select: { posts: true } } },
  });
  if (!author) notFound();

  const publishedPostCount = await prisma.post.count({
    where: { authorId: author.id, published: true },
  });
  const initial = serializeAdminAuthor(author, {
    postCount: author._count.posts,
    publishedPostCount,
  });

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title={`Edit ${author.name}`}
        description="Changes save without a redeploy. Use the visibility controls to publish or hide the profile."
        actions={
          <Link
            href="/admin/authors"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-light bg-white px-4 text-[13px] font-medium text-text transition-colors hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to authors
          </Link>
        }
      />
      <div className="mx-auto max-w-4xl">
        <AuthorForm mode="edit" initial={initial} />
      </div>
    </AdminPage>
  );
}
