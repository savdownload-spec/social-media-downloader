import { PolicyPage } from '@/components/layout/PolicyPage';
import { buildMetadata } from '@/lib/seo';
import { getComplianceSettings } from '@/lib/compliance-server';

export const metadata = buildMetadata({
  title: 'Terms & Conditions',
  description: 'Read the GetSavDown terms for website and tool usage, user responsibilities, subscriptions, payments, copyright compliance, cancellation, account termination, and liability.',
  path: '/terms',
});

export const revalidate = 300;

export default async function TermsPage() {
  const { business, policies } = await getComplianceSettings();

  return (
    <PolicyPage
      breadcrumb="Terms & Conditions"
      title={<>Terms &amp; <span className="text-gradient">Conditions.</span></>}
      description="The terms that apply to GetSavDown accounts, online tools, digital purchases, subscriptions, and use of the SavDown website."
      updated="26 November 2026"
      highlights={['Acceptable use', 'Subscriptions and cancellation', 'Liability explained']}
      content={policies.terms}
      business={business}
    />
  );
}
