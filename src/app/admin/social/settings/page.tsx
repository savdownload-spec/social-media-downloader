import { buildMetadata } from '@/lib/seo';
import { SocialSettings } from '@/components/admin/social/SocialSettings';

export const metadata = buildMetadata({ title: 'Social Automation Settings — Admin', description: '', path: '/admin/social/settings', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminSocialSettingsPage() {
  return <SocialSettings />;
}
