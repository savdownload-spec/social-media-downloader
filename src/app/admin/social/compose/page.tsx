import { buildMetadata } from '@/lib/seo';
import { SocialComposer } from '@/components/admin/social/SocialComposer';

export const metadata = buildMetadata({ title: 'Create Social Post — Admin', description: '', path: '/admin/social/compose', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminSocialComposePage() {
  return <SocialComposer />;
}
