import { buildMetadata } from '@/lib/seo';
import { SocialCalendar } from '@/components/admin/social/SocialCalendar';

export const metadata = buildMetadata({ title: 'Social Calendar — Admin', description: '', path: '/admin/social/calendar', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminSocialCalendarPage() {
  return <SocialCalendar />;
}
