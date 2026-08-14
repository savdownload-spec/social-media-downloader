import { buildMetadata } from '@/lib/seo';
import { AdminPage, PageHeader } from '@/components/admin/AdminUI';
import { AdminSupportInbox } from '@/components/admin/AdminSupportInbox';

export const metadata = buildMetadata({ title: 'Support — Admin', description: 'Support inbox and customer conversations', path: '/admin/support', noIndex: true });
export const dynamic = 'force-dynamic';
export default function AdminSupportPage() { return <AdminPage><PageHeader eyebrow="Customer care" title="Support" description="Manage customer conversations, assignments, and resolution." /><AdminSupportInbox /></AdminPage>; }
