import { buildMetadata } from '@/lib/seo';
import { AdminPage, PageHeader } from '@/components/admin/AdminUI';
import { AdminContactsTable } from '@/components/admin/AdminContactsTable';

export const metadata = buildMetadata({
  title: 'Contact Enquiries — Admin',
  description: 'Manage contact form enquiries',
  path: '/admin/contacts',
  noIndex: true,
});
export const dynamic = 'force-dynamic';

export default function AdminContactsPage() {
  return (
    <AdminPage>
      <PageHeader
        title="Contact Enquiries"
        description="View and manage messages submitted via the Contact Us form."
      />
      <AdminContactsTable />
    </AdminPage>
  );
}
