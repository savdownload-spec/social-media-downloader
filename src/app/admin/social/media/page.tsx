import { buildMetadata } from '@/lib/seo';
import { SocialMediaLibrary } from '@/components/admin/social/SocialMediaLibrary';

export const metadata = buildMetadata({ title: 'Social Media Library — Admin', description: '', path: '/admin/social/media', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminSocialMediaPage() {
  return <SocialMediaLibrary />;
}
