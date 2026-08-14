import { buildMetadata } from '@/lib/seo';
import { AdminPage, PageHeader } from '@/components/admin/AdminUI';
import { AdminReviewsTable } from '@/components/admin/AdminReviewsTable';

export const metadata = buildMetadata({
  title: 'Reviews — Admin',
  description: 'Review moderation',
  path: '/admin/reviews',
  noIndex: true,
});
export const dynamic = 'force-dynamic';

export default function AdminReviewsPage() {
  return (
    <AdminPage>
      <PageHeader
        title="Reviews"
        description="Moderate, edit, and feature customer reviews."
      />
      <AdminReviewsTable />
    </AdminPage>
  );
}
