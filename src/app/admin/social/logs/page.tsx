import { buildMetadata } from '@/lib/seo';
import { SocialLogs } from '@/components/admin/social/SocialLogs';

export const metadata = buildMetadata({ title: 'Social Publishing Logs — Admin', description: '', path: '/admin/social/logs', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminSocialLogsPage() {
  return <SocialLogs />;
}
