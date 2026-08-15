import { buildMetadata } from '@/lib/seo';
import { AdminPage, PageHeader } from '@/components/admin/AdminUI';
import { AdminCommentsClient } from '@/components/admin/AdminCommentsClient';

export const metadata = buildMetadata({ title: 'Comments â€” Admin', description: 'Blog comment moderation', path: '/admin/comments', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminCommentsPage() {
  return <AdminPage><PageHeader title="Comments" description="Review, approve, hide, and remove blog discussion." /><AdminCommentsClient /></AdminPage>;
}