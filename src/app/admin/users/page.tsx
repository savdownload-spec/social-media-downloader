import { buildMetadata } from '@/lib/seo';
import { AdminUsersClient } from '@/components/admin/AdminUsersClient';

export const metadata = buildMetadata({ title: 'Users — Admin', description: 'Manage users', path: '/admin/users', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
