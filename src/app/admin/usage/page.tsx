import { buildMetadata } from '@/lib/seo';
import { AdminUsageClient } from '@/components/admin/AdminUsageClient';
export const metadata = buildMetadata({ title: 'Usage — Admin', description: '', path: '/admin/usage', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminUsagePage() { return <AdminUsageClient />; }
