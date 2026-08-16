import { PricingTabs } from '@/components/pricing/PricingTabs';
import { Container } from '@/components/layout/Container';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';

export const metadata = { title: 'Pricing — SavDown Workspace' };

export default function WorkspacePricingPage() {
  return (
    <div className="py-6 md:py-8 space-y-6">
      {/* PricingTabs lays out its own cards inside <Container>, so the header
       *  uses the same Container here to keep both aligned to one edge. */}
      <Container>
        <WorkspacePageHeader
          align="center"
          title="Pricing"
          description="Manage your plan, buy credits, or go lifetime — same pricing as savdown.com."
        />
      </Container>
      <PricingTabs />
    </div>
  );
}
