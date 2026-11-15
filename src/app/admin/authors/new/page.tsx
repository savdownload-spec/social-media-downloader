import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { AdminPage, PageHeader } from '@/components/admin/AdminUI';
import { AuthorForm } from '@/components/admin/authors/AuthorForm';

export const metadata = buildMetadata({
  title: 'Add New Author — Admin',
  description: 'Create a new author profile for SavDown.',
  path: '/admin/authors/new',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default function AdminNewAuthorPage() {
  return (
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title="Add New Author"
        description="Create the profile, add expertise and optional links, then publish when it is ready."
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
        <AuthorForm mode="create" />
      </div>
    </AdminPage>
  );
}
