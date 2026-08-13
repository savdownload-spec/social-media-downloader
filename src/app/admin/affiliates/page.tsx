import { buildMetadata } from '@/lib/seo';
import { AdminAffiliatesClient } from '@/components/admin/AdminAffiliatesClient';
export const metadata = buildMetadata({ title: 'Affiliates — Admin', description: '', path: '/admin/affiliates', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminAffiliatesPage() { return <AdminAffiliatesClient />; }
