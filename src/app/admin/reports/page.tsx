import { buildMetadata } from '@/lib/seo';
import { AdminReportsClient } from '@/components/admin/AdminReportsClient';
export const metadata = buildMetadata({ title: 'Reports — Admin', description: '', path: '/admin/reports', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminReportsPage() { return <AdminReportsClient />; }
