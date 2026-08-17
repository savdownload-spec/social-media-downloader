import Link from 'next/link';
import { Sparkles, Link2, LineChart, BadgeCheck } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FAQSection } from '@/components/ui/FAQSection';
import { Reveal } from '@/components/ui/Reveal';
import { AffiliateApplyPanel } from '@/components/affiliates/AffiliateApplyPanel';
import {
  steps,
  benefits,
  audiences,
  promotables,
  resources,
  buildAffiliatesFaqs,
} from '@/config/affiliates';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Affiliate Program',
  description:
    'Share SavDown with your audience and earn when your referrals become customers. Simple referral links, transparent tracking, and a growing product ecosystem.',
  path: '/affiliates',
  keywords: ['savdown affiliate program', 'referral program', 'earn with savdown', 'affiliate marketing'],
});

export default function AffiliatesPage() {
  const faqs = buildAffiliatesFaqs();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-24 left-1/4 h-[26rem] w-[26rem] animate-blob rounded-full bg-indigo-brand/20 blur-3xl" />
          <div className="absolute top-0 right-1/4 h-[22rem] w-[22rem] animate-blob-slow rounded-full bg-fuchsia-brand/15 blur-3xl" />
        </div>
        <Container className="relative max-w-3xl pt-24 pb-16 text-center">
          <Breadcrumb
            className="mb-10"
            includeSchema
            items={[
              { label: 'Home', href: '/' },
              { label: 'Affiliates' },
            ]}
          />
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 glass px-4 py-1.5 shadow-soft">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <span className="text-xs font-semibold text-text-muted">SavDown Affiliate Program</span>
          </div>
          <h1 className="text-4xl font-bold leading-[1.03] tracking-[-0.03em] md:text-6xl">
            Earn <span className="text-gradient">With SavDown</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-text-muted">
            Share SavDown with your audience and earn when your referrals become customers.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <AffiliateApplyPanel />
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white dark:bg-card px-7 py-3.5 text-base font-semibold text-text shadow-soft-md transition-all hover:border-primary/40 hover:bg-primary-light dark:hover:bg-primary-light"
            >
              How It Works
            </a>
          </div>
        </Container>
      </section>

      {/* How It Works */}
      <Section variant="white" id="how-it-works" containerClassName="max-w-5xl">
        <SectionHeading
          eyebrow="How It Works"
          title="Four steps, start to finish."
          description="No fees, nothing to buy — just a genuine way to earn from an audience you already have."
        />
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <div className="relative h-full rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
                <span className="text-sm font-bold text-primary/30">{step.number}</span>
                <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow-lg">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-sm font-semibold text-text">{step.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Why Join */}
      <Section variant="default" containerClassName="max-w-5xl">
        <SectionHeading
          eyebrow="Why Join"
          title="Built to be worth your time."
          description="A straightforward program with no gimmicks — just a useful product and a fair way to be rewarded for sharing it."
        />
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, i) => (
            <Reveal key={benefit.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4 text-sm font-semibold text-text">{benefit.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{benefit.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Who Can Join */}
      <Section variant="white" containerClassName="max-w-5xl">
        <SectionHeading eyebrow="Who Can Join" title="Built for people with an audience." />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {audiences.map((audience) => (
            <Link
              key={audience.label}
              href={audience.href}
              className="flex items-center gap-2.5 rounded-2xl border border-border bg-white dark:bg-card p-4 shadow-soft transition-all hover:border-primary/30 hover:shadow-soft-md"
            >
              <audience.icon className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-sm font-medium text-text">{audience.label}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* What Can Be Promoted */}
      <Section variant="default" containerClassName="max-w-5xl">
        <SectionHeading eyebrow="What You Can Promote" title="Everything SavDown offers." />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {promotables.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-white dark:bg-card p-5 text-center shadow-soft transition-all hover:border-primary/30 hover:shadow-soft-md"
            >
              <item.icon className="h-5 w-5 flex-shrink-0 text-primary" />
              <span className="text-xs font-semibold text-text">{item.label}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* Commission, Tracking, Payouts */}
      <Section variant="white" containerClassName="max-w-4xl">
        <SectionHeading eyebrow="The Details" title="Commission, tracking, and payouts." />
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light">
              <BadgeCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 text-sm font-semibold text-text">Commission</div>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              You earn commission on qualifying referrals — people who sign up through your link and become
              paying customers. Our commission model supports flat, percentage, first-purchase, recurring, and
              product-specific structures, and the exact terms are confirmed with you once your application is
              approved.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 text-sm font-semibold text-text">Tracking</div>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              Every affiliate gets a unique referral link. Visits, signups, and conversions attributed to your
              link are recorded against your{' '}
              <Link href="/account" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
                account
              </Link>
              , so you always know what came from your audience.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light">
              <LineChart className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 text-sm font-semibold text-text">Payouts</div>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              Minimum payout, payout method, and payout schedule are shared with you during onboarding once
              you&apos;re approved, so you know exactly what to expect before you start promoting.
            </p>
          </div>
        </div>
      </Section>

      {/* Marketing Resources */}
      <Section variant="default" containerClassName="max-w-5xl">
        <SectionHeading
          eyebrow="Marketing Resources"
          title="Everything you need to promote SavDown well."
          description={
            <>
              Made available to approved affiliates from their{' '}
              <Link href="/account" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
                account
              </Link>
              .
            </>
          }
        />
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <div key={resource.label} className="flex items-start gap-3 rounded-2xl border border-border bg-white dark:bg-card p-5 shadow-soft">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light">
                <resource.icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text">{resource.label}</div>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">{resource.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <FAQSection items={faqs} variant="white" />

      {/* Closing CTA */}
      <Section variant="default">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand bg-[length:200%_200%] animate-gradient text-white px-8 py-16 text-center md:px-16 md:py-20 shadow-glow-lg">
          <div className="pointer-events-none absolute -top-16 -right-16 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-fuchsia-brand/30 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ready to grow with SavDown?</h2>
            <p className="mt-3 text-white/70 leading-relaxed">
              Join the affiliate program and start sharing SavDown with the people who&apos;ll actually use it.
            </p>
            <div className="mt-8 flex justify-center">
              <AffiliateApplyPanel variant="panel" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
