import { buildMetadata } from '@/lib/seo';
import { AdminToolsClient } from '@/components/admin/AdminToolsClient';
export const metadata = buildMetadata({ title: 'Tools — Admin', description: '', path: '/admin/tools', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminToolsPage() { return <AdminToolsClient />; }
