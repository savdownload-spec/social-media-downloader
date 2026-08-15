import Link from 'next/link';
import {
  Sparkles, Shield, Zap, CheckCircle2, ListChecks, Lightbulb, Users,
  ArrowRight,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { toolContent, type ToolLongContent } from '@/config/toolContent';

type ToolLongContentSectionProps = {
  slug: string;
};

/**
 * Renders the ~1,000+ word SEO content block for a tool, below the FAQ and
 * supported-formats sections. If no content is configured for the slug, the
 * component renders nothing (silent no-op).
 */
export function ToolLongContentSection({ slug }: ToolLongContentSectionProps) {
  const content = toolContent[slug];
  if (!content) return null;

  return (
    <>
      {/* Introduction + what it does */}
      <Section variant="default" containerClassName="max-w-4xl">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
              About this tool
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text leading-[1.05]">
              Everything you need to know.
            </h2>
            <p className="mt-4 text-text-muted leading-relaxed">
              A complete guide to what this tool does, why people use it, and how to get the
              best results every time.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href="#introduction"
                className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
              >
                ↓ Introduction
              </a>
              <a
                href="#what-it-does"
                className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
              >
                ↓ What it does
              </a>
              <a
                href="#key-features"
                className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
              >
                ↓ Key features
              </a>
              <a
                href="#why-choose"
                className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
              >
                ↓ Why choose SavDown
              </a>
            </div>
          </div>
          <div className="lg:col-span-7 space-y-6">
            <div id="introduction">
              <h3 className="text-xl font-bold text-text tracking-tight">Introduction</h3>
              <p className="mt-3 text-base text-text-muted leading-relaxed">
                {content.introduction}
              </p>
            </div>
            <div id="what-it-does">
              <h3 className="text-xl font-bold text-text tracking-tight">What this tool does</h3>
              <p className="mt-3 text-base text-text-muted leading-relaxed">
                {content.whatItDoes}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Key features */}
      <Section variant="white" containerClassName="max-w-6xl">
        <div id="key-features" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Key features"
            title={<>Built To <span className="text-gradient">Do The Job Right.</span></>}
            description="Every feature exists because someone needed it, and every one of them ships by default, free."
          />
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {content.keyFeatures.map((f, i) => (
            <div
              key={f.title}
              className="group p-6 bg-white border border-border rounded-2xl shadow-soft hover:shadow-soft-md hover:-translate-y-0.5 hover:border-primary/30 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-lg group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="mt-4 text-base font-bold text-text tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Benefits */}
      <Section variant="muted" containerClassName="max-w-6xl">
        <SectionHeading
          eyebrow="Benefits"
          title={<>Why People <span className="text-gradient">Actually Use It.</span></>}
          description="Beyond the headline features, here is what the tool unlocks in real workflows."
        />
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {content.benefits.map((b, i) => (
            <div
              key={b.title}
              className="p-6 bg-white border border-border-light rounded-2xl"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent-light text-accent-hover">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-text tracking-tight">{b.title}</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Best practices */}
      <Section variant="white" containerClassName="max-w-4xl">
        <SectionHeading
          eyebrow="Best practices"
          title={<>Use It <span className="text-gradient">The Right Way.</span></>}
          description="A few habits that consistently produce the best results."
        />
        <div className="mt-12 rounded-2xl bg-surface border border-border-light p-6 md:p-8">
          <ul className="space-y-4">
            {content.bestPractices.map((p, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-white border border-border-light text-primary text-sm font-bold flex items-center justify-center shadow-soft">
                  {i + 1}
                </span>
                <span className="text-base text-text leading-relaxed pt-0.5">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Supported platforms */}
      <Section variant="default" containerClassName="max-w-4xl">
        <SectionHeading
          eyebrow="Supported platforms"
          title={<>Works With <span className="text-gradient">Every URL Format.</span></>}
          description="If the platform publishes a public link to the content, this tool can save it."
        />
        <div className="mt-12 flex flex-wrap justify-center gap-2.5">
          {content.supportedPlatforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-border-light shadow-soft text-sm font-medium text-text-muted"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              {p}
            </span>
          ))}
        </div>
      </Section>

      {/* Common use cases */}
      <Section variant="tinted" containerClassName="max-w-6xl">
        <SectionHeading
          eyebrow="Common use cases"
          title={<>Built For <span className="text-gradient">Real Workflows.</span></>}
          description="How creators, students, marketers, and researchers use this tool in practice."
        />
        <div className="mt-14 grid sm:grid-cols-2 gap-5">
          {content.commonUseCases.map((u, i) => (
            <div
              key={u.title}
              className="p-6 md:p-7 bg-white border border-border-light rounded-2xl shadow-soft"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gradient-brand text-white text-xs font-bold flex items-center justify-center shadow-glow-lg">
                  {i + 1}
                </span>
                <h3 className="text-base font-bold text-text tracking-tight">{u.title}</h3>
              </div>
              <p className="mt-3 text-sm text-text-muted leading-relaxed">{u.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Tips and tricks */}
      <Section variant="white" containerClassName="max-w-4xl">
        <SectionHeading
          eyebrow="Tips & tricks"
          title={<>Power-User <span className="text-gradient">Tips.</span></>}
          description="Small habits that save time and produce better files."
        />
        <div className="mt-12 grid sm:grid-cols-2 gap-4">
          {content.tipsAndTricks.map((t, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-5 bg-surface border border-border-light rounded-2xl"
            >
              <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-text leading-relaxed">{t}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Why choose SavDown */}
      <Section variant="default" containerClassName="max-w-4xl">
        <div id="why-choose" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Why choose SavDown"
            title={<>Why <span className="text-gradient">This Tool?</span></>}
          />
        </div>
        <div className="mt-10 rounded-3xl bg-ink text-white p-8 md:p-12 shadow-soft-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] pointer-events-none" />
          <div className="relative max-w-3xl mx-auto">
            <p className="text-base md:text-lg text-ink-muted leading-relaxed">
              {content.whyChoose}
            </p>
            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <Zap className="w-5 h-5 text-gradient-light mb-2" />
                <h4 className="text-sm font-bold">Fast</h4>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">Most downloads complete in under 10 seconds.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <Shield className="w-5 h-5 text-gradient-light mb-2" />
                <h4 className="text-sm font-bold">Private</h4>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">We never log, store, or share your activity.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <Users className="w-5 h-5 text-gradient-light mb-2" />
                <h4 className="text-sm font-bold">Free</h4>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">No signup, no watermarks, no daily caps.</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Conclusion */}
      <Section variant="white" containerClassName="max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
            Conclusion
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
            <span className="text-gradient">Wrapping up.</span>
          </h2>
          <p className="mt-5 text-lg text-text-muted leading-relaxed">
            {content.conclusion}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
            >
              Try It Now <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-text bg-white border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-all active:scale-[0.98]"
            >
              <ListChecks className="w-4 h-4" /> Browse All Tools
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
