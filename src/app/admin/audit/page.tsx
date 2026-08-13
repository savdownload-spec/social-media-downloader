import { buildMetadata } from '@/lib/seo';
import { AdminAuditClient } from '@/components/admin/AdminAuditClient';
export const metadata = buildMetadata({ title: 'Audit Log — Admin', description: '', path: '/admin/audit', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminAuditPage() { return <AdminAuditClient />; }
