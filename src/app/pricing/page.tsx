import { Sparkles } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FAQSection } from '@/components/ui/FAQSection';
import { PricingTabs } from '@/components/pricing/PricingTabs';
import { TrustStrip } from '@/components/pricing/TrustStrip';
import { ComparisonTable } from '@/components/pricing/ComparisonTable';
import { HowCreditsWork } from '@/components/pricing/HowCreditsWork';
import { buildPricingFaqs } from '@/config/pricing';
import { getPricingConfig } from '@/lib/pricing-server';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Pricing',
  description:
    'SavDown is free to use every day. Upgrade when you need more â€” Pro monthly or yearly, one-time credit packs, or a single Lifetime payment.',
  path: '/pricing',
  keywords: ['savdown pricing', 'video downloader pricing', 'download credits', 'pro plan'],
});

export default async function PricingPage() {
  const config = await getPricingConfig();
  const faqs = buildPricingFaqs(config);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-24 left-1/4 h-[26rem] w-[26rem] animate-blob rounded-full bg-indigo-brand/20 blur-3xl" />
          <div className="absolute top-0 right-1/4 h-[22rem] w-[22rem] animate-blob-slow rounded-full bg-fuchsia-brand/15 blur-3xl" />
        </div>
        <Container className="relative max-w-3xl pt-24 pb-10 text-center">
          <Breadcrumb
            className="mb-10"
            includeSchema
            items={[
              { label: 'Home', href: '/' },
              { label: 'Pricing' },
            ]}
          />
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 glass px-4 py-1.5 shadow-soft">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <span className="text-xs font-semibold text-text-muted">
              Free daily credits today Â· paid plans launching soon
            </span>
          </div>
          <h1 className="text-4xl font-bold leading-[1.03] tracking-[-0.03em] md:text-6xl">
            Start <span className="text-gradient">free</span>. Upgrade when you need more.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-text-muted">
            Create a free account and use every SavDown tool with a daily credit allowance, no card
            required. Pick a plan only when you outgrow it.
          </p>
        </Container>
      </section>

      <PricingTabs />
      <TrustStrip />
      <HowCreditsWork />
      <ComparisonTable />

      <FAQSection items={faqs} variant="white" />
    </>
  );
}

