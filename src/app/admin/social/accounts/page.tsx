import { buildMetadata } from '@/lib/seo';
import { SocialAccounts } from '@/components/admin/social/SocialAccounts';

export const metadata = buildMetadata({ title: 'Social Accounts — Admin', description: '', path: '/admin/social/accounts', noIndex: true });
export const dynamic = 'force-dynamic';

export default function AdminSocialAccountsPage() {
  return <SocialAccounts />;
}
