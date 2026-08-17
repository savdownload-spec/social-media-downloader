import { buildMetadata } from '@/lib/seo';
import { AdminAiImageClient } from '@/components/admin/AdminAiImageClient';
export const metadata = buildMetadata({ title: 'AI Image Generator — Admin', description: '', path: '/admin/ai-image', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminAiImagePage() { return <AdminAiImageClient />; }
