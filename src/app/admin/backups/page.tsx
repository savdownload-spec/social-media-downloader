import { buildMetadata } from '@/lib/seo';
import { AdminBackupClient } from '@/components/admin/AdminBackupClient';

export const metadata = buildMetadata({ title: 'Backup & Restore — Admin', description: '', path: '/admin/backups', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminBackupsPage() {
  return <AdminBackupClient />;
}
