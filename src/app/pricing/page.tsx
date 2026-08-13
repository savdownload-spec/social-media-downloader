import { Sparkles } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { FAQSection } from '@/components/ui/FAQSection';
import { PricingTabs } from '@/components/pricing/PricingTabs';
import { TrustStrip } from '@/components/pricing/TrustStrip';
import { HowCreditsWork } from '@/components/pricing/HowCreditsWork';
import { pricingFaqs } from '@/config/pricing';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Pricing',
  description:
    'SavDown is free to use every day. Upgrade only if you need more: Pro, Max, one-time credit packs, or a single Lifetime payment.',
  path: '/pricing',
  keywords: ['savdown pricing', 'video downloader pricing', 'download credits', 'pro plan'],
});

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-24 left-1/4 w-[26rem] h-[26rem] bg-indigo-brand/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-0 right-1/4 w-[22rem] h-[22rem] bg-fuchsia-brand/15 rounded-full blur-3xl animate-blob-slow" />
        </div>
        <Container className="relative pt-24 pb-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-primary/15 glass shadow-soft">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-xs font-semibold text-text-muted">
              Free daily credits · no card required
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.03em] leading-[1.03]">
            Start <span className="text-gradient">free</span>. Upgrade only if you need more.
          </h1>
          <p className="mt-5 text-lg text-text-muted leading-relaxed max-w-xl mx-auto">
            Create a free account and every SavDown tool is yours to use with a daily allowance of
            credits, no card required. The plans below are for people who need more than that.
          </p>
        </Container>
      </section>

      <PricingTabs />
      <TrustStrip />
      <HowCreditsWork />

      <FAQSection items={pricingFaqs} variant="white" />
    </>
  );
}
