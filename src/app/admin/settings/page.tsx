import { buildMetadata } from '@/lib/seo';
import { AdminSettingsClient } from '@/components/admin/AdminSettingsClient';
export const metadata = buildMetadata({ title: 'Settings — Admin', description: '', path: '/admin/settings', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminSettingsPage() { return <AdminSettingsClient />; }
