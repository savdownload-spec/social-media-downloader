import { buildMetadata } from '@/lib/seo';
import { AdminPaymentsClient } from '@/components/admin/AdminPaymentsClient';
export const metadata = buildMetadata({ title: 'Payments — Admin', description: '', path: '/admin/payments', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminPaymentsPage() { return <AdminPaymentsClient />; }
