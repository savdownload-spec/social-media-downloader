import { buildMetadata } from '@/lib/seo';
import { AdminCreditsClient } from '@/components/admin/AdminCreditsClient';
export const metadata = buildMetadata({ title: 'Credits — Admin', description: '', path: '/admin/credits', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminCreditsPage() { return <AdminCreditsClient />; }
