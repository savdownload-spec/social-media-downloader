import { PolicyPage } from '@/components/layout/PolicyPage';
import { buildMetadata } from '@/lib/seo';
import { getComplianceSettings } from '@/lib/compliance-server';

export const metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'Learn how GetSavDown collects, uses, protects, and retains account, tool, payment, cookie, analytics, and support information, and how to exercise your privacy rights.',
  path: '/privacy',
});

export const revalidate = 300;

export default async function PrivacyPage() {
  const { business, policies } = await getComplianceSettings();

  return (
    <PolicyPage
      breadcrumb="Privacy Policy"
      title={<>Privacy <span className="text-gradient">Policy.</span></>}
      description="How GetSavDown handles account, tool, payment, analytics, and support information across the SavDown website and digital services."
      updated="26 November 2026"
      highlights={['Data collection explained', 'Payment records covered', 'Privacy contact provided']}
      content={policies.privacy}
      business={business}
    />
  );
}
