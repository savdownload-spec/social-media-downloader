import { PricingTabs } from '@/components/pricing/PricingTabs';

export const metadata = { title: 'Pricing — SavDown Workspace' };

export default function WorkspacePricingPage() {
  return (
    <div className="py-6 md:py-8">
      <div className="px-4 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-bold tracking-tight text-text">Pricing</h1>
        <p className="text-sm text-text-muted mt-1 mb-2">
          Manage your plan, buy credits, or go lifetime — same pricing as savdown.com.
        </p>
      </div>
      <PricingTabs />
    </div>
  );
}
