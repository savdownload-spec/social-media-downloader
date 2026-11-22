import { buildMetadata } from '@/lib/seo';
import { SocialPosts } from '@/components/admin/social/SocialPosts';

export const metadata = buildMetadata({ title: 'Social Posts — Admin', description: '', path: '/admin/social/posts', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminSocialPostsPage() {
  return <SocialPosts />;
}
