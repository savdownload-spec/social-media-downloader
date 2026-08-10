import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Container } from '@/components/layout/Container';
import { authOptions } from '@/lib/auth';
import { buildMetadata } from '@/lib/seo';
import { AdminReviewsTable } from '@/components/admin/AdminReviewsTable';

export const metadata = buildMetadata({
  title: 'Manage Reviews',
  description: 'Admin review moderation',
  path: '/admin/reviews',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session) redirect('/');
  if (role !== 'ADMIN') {
    return (
      <Container className="py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Access denied</h1>
        <p className="mt-4 text-text-muted">You need admin privileges to view this page.</p>
      </Container>
    );
  }

  return (
    <Container className="py-16">
      <p className="text-sm font-medium text-primary mb-3">Admin</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Manage Reviews</h1>
      <p className="mt-3 text-text-muted">Approve, reject, edit, or feature submitted reviews.</p>

      <div className="mt-10">
        <AdminReviewsTable />
      </div>
    </Container>
  );
}
