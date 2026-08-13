import { buildMetadata } from '@/lib/seo';
import { AdminSubscriptionsClient } from '@/components/admin/AdminSubscriptionsClient';
export const metadata = buildMetadata({ title: 'Subscriptions — Admin', description: '', path: '/admin/subscriptions', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminSubscriptionsPage() { return <AdminSubscriptionsClient />; }
