import { buildMetadata } from '@/lib/seo';
import { AdminContentClient } from '@/components/admin/AdminContentClient';
export const metadata = buildMetadata({ title: 'Content — Admin', description: '', path: '/admin/content', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminContentPage() { return <AdminContentClient />; }
