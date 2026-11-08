import Link from 'next/link';
import {
  Sparkles, Shield, Zap, CheckCircle2, ListChecks, Lightbulb, Users,
  ArrowRight,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { toolContent } from '@/config/toolContent';
import { getToolGuide } from '@/config/toolGuides';
import type { ToolGuide } from '@/config/toolGuide';
import { getPublicBlogPosts } from '@/lib/blog';
import { ToolContentNav, type ToolContentNavItem } from './ToolContentNav';

type ToolLongContentSectionProps = {
  slug: string;
  guide?: ToolGuide;
};

const contentNavItems: ToolContentNavItem[] = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'what-it-does', label: 'What It Does' },
  { id: 'key-features', label: 'Key Features' },
  { id: 'why-choose', label: 'Why Choose SavDown' },
];

const minorTitleWords = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or',
  'per', 'the', 'to', 'via', 'vs', 'vs.',
]);

/** Title-cases display labels while leaving brands, acronyms, URLs, and notation intact. */
function toDisplayTitle(value: string) {
  const words = value.split(/(\s+)/);
  const textWords = words.filter((word) => word.trim().length > 0);
  let textIndex = 0;

  return words.map((word) => {
    if (!word.trim()) return word;

    const index = textIndex++;
    const isFirst = index === 0;
    const isLast = index === textWords.length - 1;

    if (
      /[\d./@×]/.test(word)
      || /[a-z][A-Z]/.test(word)
      || /[A-Z]{2}/.test(word)
    ) {
      return word;
    }

    const letterGroups = word.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g);
    const isMinorWord = letterGroups?.length === 1
      && minorTitleWords.has(letterGroups[0].toLowerCase())
      && !isFirst
      && !isLast;

    if (isMinorWord) {
      return word.replace(letterGroups[0], letterGroups[0].toLowerCase());
    }

    return word.replace(/[A-Za-z]+(?:['’][A-Za-z]+)*/g, (part) => {
      const normalized = part.toLowerCase();
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    });
  }).join('');
}

/**
 * Render the approved master composition with independently authored content.
 * The master retains its original copy and navigation; other guides supply
 * capability-specific headings, resources, policy cards and anchored CTAs.
 */
export async function ToolLongContentSection({ slug, guide = getToolGuide(slug) }: ToolLongContentSectionProps) {
  const configured = guide ?? toolContent[slug];
  if (!configured) return null;
  const articles = guide ? (await getPublicBlogPosts()).filter((post) => post.toolSlug === slug && !post.noIndex).slice(0, 3) : [];
  const content = articles.length && configured.resources ? {
    ...configured,
    resources: { ...configured.resources, guides: articles.map((post) => ({ label: post.title, href: `/blog/${post.slug}`, description: post.excerpt })) },
  } : configured;
  return (
    <>
      {/* Introduction + what it does */}
      <Section variant="default" containerClassName="max-w-6xl">
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
          <aside className="lg:sticky lg:top-24 lg:col-span-5">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
              About This Tool
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text leading-[1.08]">
              Everything You Need to Know.
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-text-muted">
              A complete guide to what this tool does, why people use it, and how to get the
              best results every time.
            </p>
            <ToolContentNav items={guide ? [
              ...contentNavItems.slice(0, 3),
              { id: 'benefits', label: 'Benefits' },
              { id: 'best-practices', label: 'Best Practices' },
              { id: 'helpful-resources', label: 'Helpful Resources' },
              { id: 'supported-inputs', label: 'Supported Inputs' },
              { id: 'use-cases', label: 'Common Use Cases' },
              { id: 'tips-and-tricks', label: 'Tips & Tricks' },
              ...contentNavItems.slice(3),
              { id: 'conclusion', label: 'Conclusion' },
            ] : contentNavItems} />
          </aside>
          <article className="space-y-10 lg:col-span-7 lg:border-l lg:border-border-light lg:pl-12">
            <div id="introduction" className="scroll-mt-28">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">01</p>
              <h3 className="mt-2 text-2xl font-bold text-text tracking-tight">Introduction</h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-text-muted">
                {content.introduction}
              </p>
            </div>
            <div id="what-it-does" className="scroll-mt-28 border-t border-border-light pt-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">02</p>
              <h3 className="mt-2 text-2xl font-bold text-text tracking-tight">What This Tool Does</h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-text-muted">
                {content.whatItDoes}
              </p>
            </div>
          </article>
        </div>
      </Section>

      {/* Key features */}
      <Section variant="white" containerClassName="max-w-6xl">
        <div id="key-features" className="scroll-mt-28">
          <SectionHeading
            eyebrow="Key features"
            title={guide ? <span className="text-gradient">{guide.featureHeading}</span> : <>Built To <span className="text-gradient">Do The Job Right.</span></>}
            description={guide?.featureIntroduction ?? 'Every feature exists because someone needed it, and every one of them ships by default, free.'}
          />
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {content.keyFeatures.map((f, i) => (
            <div
              key={f.title}
              className="group p-6 bg-white dark:bg-card border border-border rounded-2xl shadow-soft hover:shadow-soft-md hover:-translate-y-0.5 hover:border-primary/30 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-lg group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="mt-4 text-base font-bold text-text tracking-tight">{toDisplayTitle(f.title)}</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Benefits */}
      <Section id={guide ? 'benefits' : undefined} className="scroll-mt-28" variant="muted" containerClassName="max-w-6xl">
        <SectionHeading
          eyebrow="Benefits"
          title={<>Why People <span className="text-gradient">Actually Use It.</span></>}
          description="Beyond the headline features, here is what the tool unlocks in real workflows."
        />
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {content.benefits.map((b, i) => (
            <div
              key={b.title}
              className="p-6 bg-white dark:bg-card border border-border-light rounded-2xl"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent-light text-accent-hover">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-text tracking-tight">{toDisplayTitle(b.title)}</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Best practices */}
      <Section id={guide ? 'best-practices' : undefined} className="scroll-mt-28" variant="white" containerClassName="max-w-4xl">
        <SectionHeading
          eyebrow="Best practices"
          title={<>Use It <span className="text-gradient">The Right Way.</span></>}
          description="A few habits that consistently produce the best results."
        />
        <div className="mt-12 rounded-2xl bg-surface border border-border-light p-6 md:p-8">
          <ul className="space-y-4">
            {content.bestPractices.map((p, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-white dark:bg-card border border-border-light text-primary text-sm font-bold flex items-center justify-center shadow-soft">
                  {i + 1}
                </span>
                <span className="text-base text-text leading-relaxed pt-0.5">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        {content.resources && (
          <div id={guide ? 'helpful-resources' : undefined} className="mt-12 border-t border-border-light pt-12 scroll-mt-28">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
                Helpful Resources
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-text">
                {guide ? 'Guides and Official References' : 'YouTube Guides and Official References'}
              </h3>
              <p className="mt-4 text-base leading-7 text-text-muted">
                {content.resources.introduction}
              </p>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-bold text-text">{guide && !content.resources.guides.length ? 'SavDown Service Information' : 'SavDown Guides'}</h4>
                <ul className="mt-4 space-y-4">
                  {guide && !content.resources.guides.length && [
                    { href: '/privacy', label: 'SavDown Privacy Policy', description: 'Review account data, site analytics and service privacy information.' },
                    { href: '/pricing', label: 'SavDown Plans and Credits', description: 'Review current account allowances and credit options.' },
                  ].map((resource) => (
                    <li key={resource.href}>
                      <Link href={resource.href} className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-hover">{resource.label}<ArrowRight className="h-4 w-4" /></Link>
                      <p className="mt-1 text-sm leading-6 text-text-muted">{resource.description}</p>
                    </li>
                  ))}
                  {content.resources.guides.map((resource) => (
                    <li key={resource.href}>
                      <Link
                        href={resource.href}
                        className="group inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-hover"
                      >
                        {resource.label}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                      <p className="mt-1 text-sm leading-6 text-text-muted">{resource.description}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold text-text">{guide ? 'Official Documentation' : 'Official YouTube Information'}</h4>
                <ul className="mt-4 space-y-4">
                  {content.resources.officialReferences.map((resource) => (
                    <li key={resource.href}>
                      <a
                        href={resource.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-hover"
                      >
                        {resource.label}
                        <ArrowRight className="h-4 w-4 -rotate-45 transition-transform group-hover:translate-x-0.5" />
                      </a>
                      <p className="mt-1 text-sm leading-6 text-text-muted">{resource.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-8 rounded-xl border border-border-light bg-surface px-4 py-3 text-xs leading-5 text-text-muted">
              {content.resources.disclosure}
            </p>
          </div>
        )}
      </Section>

      {/* Supported platforms */}
      <Section id={guide ? 'supported-inputs' : undefined} className="scroll-mt-28" variant="default" containerClassName="max-w-4xl">
        <SectionHeading
          eyebrow={guide ? 'Supported inputs' : 'Supported platforms'}
          title={guide ? <span className="text-gradient">{guide.inputHeading}</span> : <>Works With <span className="text-gradient">Every URL Format.</span></>}
          description={guide?.inputIntroduction ?? 'If the platform publishes a public link to the content, this tool can save it.'}
        />
        <div className="mt-12 flex flex-wrap justify-center gap-2.5">
          {content.supportedPlatforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-card border border-border-light shadow-soft text-sm font-medium text-text-muted"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              {guide ? p : toDisplayTitle(p)}
            </span>
          ))}
        </div>
      </Section>

      {/* Common use cases */}
      <Section id={guide ? 'use-cases' : undefined} className="scroll-mt-28" variant="tinted" containerClassName="max-w-6xl">
        <SectionHeading
          eyebrow="Common use cases"
          title={<>Built For <span className="text-gradient">Real Workflows.</span></>}
          description={guide ? 'Practical applications of the inputs, controls and outputs described above.' : 'How creators, students, marketers, and researchers use this tool in practice.'}
        />
        <div className="mt-14 grid sm:grid-cols-2 gap-5">
          {content.commonUseCases.map((u, i) => (
            <div
              key={u.title}
              className="p-6 md:p-7 bg-white dark:bg-card border border-border-light rounded-2xl shadow-soft"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gradient-brand text-white text-xs font-bold flex items-center justify-center shadow-glow-lg">
                  {i + 1}
                </span>
                <h3 className="text-base font-bold text-text tracking-tight">{toDisplayTitle(u.title)}</h3>
              </div>
              <p className="mt-3 text-sm text-text-muted leading-relaxed">{u.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Tips and tricks */}
      <Section id={guide ? 'tips-and-tricks' : undefined} className="scroll-mt-28" variant="white" containerClassName="max-w-4xl">
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
        <div id="why-choose" className="scroll-mt-28">
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
            {guide ? <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {guide.reassurance.map((item, index) => {
                const Icon = [Zap, Shield, Users][index % 3];
                return <div key={item.title} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <Icon className="w-5 h-5 text-gradient-light mb-2" />
                  <h3 className="text-sm font-bold">{item.title}</h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">{item.description}</p>
                </div>;
              })}
            </div> : <div className="mt-8 grid sm:grid-cols-3 gap-4">
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
            </div>}
          </div>
        </div>
      </Section>

      {/* Conclusion */}
      <Section id={guide ? 'conclusion' : undefined} className="scroll-mt-28" variant="white" containerClassName="max-w-3xl">
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
              href={guide?.ctaHref ?? '#'}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
            >
              {guide?.ctaLabel ?? 'Try It Now'} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-text bg-white dark:bg-card border border-border hover:border-primary/40 hover:bg-primary-light transition-all active:scale-[0.98]"
            >
              <ListChecks className="w-4 h-4" /> Browse All Tools
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
