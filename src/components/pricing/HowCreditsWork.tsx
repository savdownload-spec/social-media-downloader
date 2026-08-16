import { ArrowRight, Zap } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { creditFlow, creditCosts } from '@/config/pricing';

/**
 * The short "what is a credit" explainer: the four-step flow, then what each
 * kind of job actually costs.
 */
export function HowCreditsWork() {
  return (
    <Section variant="white" containerClassName="max-w-5xl">
      <SectionHeading
        eyebrow="How SavCredits Work"
        title="One credit, one download."
        description="Most downloads cost a single credit. Bigger jobs cost a little more, and you always see the cost before anything runs."
      />

      {/* Flow */}
      <div className="mt-14 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        {creditFlow.map((step, i) => (
          <div key={step.title} className="contents">
            <Reveal delay={i * 0.08} className="flex-1">
              <div className="h-full rounded-2xl border border-border bg-white dark:bg-card p-6 text-center shadow-soft">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow-lg">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-sm font-semibold text-text">{step.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {step.description}
                </p>
              </div>
            </Reveal>
            {i < creditFlow.length - 1 && (
              <ArrowRight
                className="mx-auto h-4 w-4 flex-shrink-0 rotate-90 text-text-subtle md:rotate-0"
                aria-hidden
              />
            )}
          </div>
        ))}
      </div>

      {/* What things cost */}
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {creditCosts.map((cost) => (
          <div
            key={cost.label}
            className="rounded-2xl border border-border bg-white dark:bg-card p-6 text-center shadow-soft"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand shadow-glow-lg">
              <cost.icon className="h-5 w-5 text-white" />
            </div>
            <div className="mt-4 text-sm font-semibold text-text">{cost.label}</div>
            <div className="mt-1 text-sm font-bold text-gradient">{cost.cost}</div>
          </div>
        ))}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-text-muted">
        <Zap className="h-4 w-4 flex-shrink-0 text-primary" />
        Every account starts with free daily credits. No card required.
      </p>
    </Section>
  );
}
