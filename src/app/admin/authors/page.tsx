import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { AdminPage, PageHeader } from '@/components/admin/AdminUI';
import { AdminAuthorsClient } from '@/components/admin/authors/AdminAuthorsClient';

export const metadata = buildMetadata({
  title: 'Authors — Admin',
  description: 'Manage author profiles, social links, publishing status, and linked articles.',
  path: '/admin/authors',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default function AdminAuthorsPage() {
  return (
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title="Authors"
        description="Manage editorial profiles, expertise, social links, and the articles linked to each author."
        actions={
          <Link
            href="/admin/authors/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add New Author
          </Link>
        }
      />
      <AdminAuthorsClient />
    </AdminPage>
  );
}
