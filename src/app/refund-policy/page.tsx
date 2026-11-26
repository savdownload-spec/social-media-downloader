import { PolicyPage } from '@/components/layout/PolicyPage';
import { buildMetadata } from '@/lib/seo';
import { getComplianceSettings } from '@/lib/compliance-server';

export const metadata = buildMetadata({
  title: 'Return & Refund Policy',
  description: 'Review the GetSavDown policy for digital-purchase refunds, duplicate payments, failed transactions, technical issues, subscription cancellation, refund requests, and support.',
  path: '/refund-policy',
});

export const revalidate = 300;

export default async function RefundPolicyPage() {
  const { business, policies } = await getComplianceSettings();

  return (
    <PolicyPage
      breadcrumb="Return & Refund Policy"
      title={<>Return &amp; <span className="text-gradient">Refund Policy.</span></>}
      description="How GetSavDown reviews digital-purchase refunds, duplicate or failed payments, technical delivery issues, cancellations, and refund requests."
      updated="26 November 2026"
      highlights={['Digital purchases', 'Duplicate payments', 'Cancellation and support']}
      content={policies.refund}
      business={business}
    />
  );
}
