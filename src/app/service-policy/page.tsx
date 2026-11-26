import { PolicyPage } from '@/components/layout/PolicyPage';
import { buildMetadata } from '@/lib/seo';
import { getComplianceSettings } from '@/lib/compliance-server';

export const metadata = buildMetadata({
  title: 'Shipping & Service Delivery Policy',
  description: 'Learn how GetSavDown delivers digital tools, subscriptions, credits, and premium features without physical shipping, plus payment confirmation, activation delays, and support.',
  path: '/service-policy',
});

export const revalidate = 300;

export default async function ServicePolicyPage() {
  const { business, policies } = await getComplianceSettings();

  return (
    <PolicyPage
      breadcrumb="Shipping & Service Delivery Policy"
      title={<>Shipping &amp; <span className="text-gradient">Service Delivery.</span></>}
      description="GetSavDown provides digital services only. This policy explains online access, payment confirmation, subscription activation, purchased credits, and help with delivery delays."
      updated="26 November 2026"
      highlights={['No physical shipping', 'Digital activation', 'Support for delays']}
      content={policies.service}
      business={business}
    />
  );
}
