import { buildMetadata } from '@/lib/seo';
import { AdminPricingClient } from '@/components/admin/AdminPricingClient';
export const metadata = buildMetadata({ title: 'Pricing — Admin', description: '', path: '/admin/pricing', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminPricingPage() { return <AdminPricingClient />; }
