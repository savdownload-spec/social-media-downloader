import { buildMetadata } from '@/lib/seo';
import { SocialAnalytics } from '@/components/admin/social/SocialAnalytics';

export const metadata = buildMetadata({ title: 'Social Analytics — Admin', description: '', path: '/admin/social/analytics', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminSocialAnalyticsPage() {
  return <SocialAnalytics />;
}
