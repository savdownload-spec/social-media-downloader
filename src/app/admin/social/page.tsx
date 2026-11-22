import { buildMetadata } from '@/lib/seo';
import { SocialOverview } from '@/components/admin/social/SocialOverview';

export const metadata = buildMetadata({ title: 'Social Media — Admin', description: '', path: '/admin/social', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminSocialPage() {
  return <SocialOverview />;
}
