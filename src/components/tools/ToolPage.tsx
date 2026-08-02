import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircle2, Zap, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Accordion } from '@/components/ui/Accordion';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { DownloaderForm } from './DownloaderForm';
import { ToolLongContentSection } from './ToolLongContent';
import { getCatalogTool, fallbackIcon, catalog } from '@/config/catalog';
import type { Tool } from '@/config/tools';
import { jsonLd, faqSchema, softwareAppSchema, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/config/site';

const perks = [
  { icon: Zap, label: 'Blazing Fast', desc: 'Under-a-second link analysis.' },
  { icon: Lock, label: 'Fully Private', desc: 'Nothing is stored on our servers.' },
  { icon: Sparkles, label: 'No Watermarks', desc: 'Clean, original media output.' },
];

export function ToolPageView({ tool }: { tool: Tool }) {
  const url = `${siteConfig.url}/tools/${tool.slug}`;
  const meta = getCatalogTool(tool.slug);
  const Icon = meta?.icon ?? fallbackIcon;
  const tile = meta?.tile ?? 'bg-primary-light text-primary';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          softwareAppSchema({ name: tool.name, description: tool.description, url }),
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(faqSchema(tool.faq))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', url: siteConfig.url },
            { name: 'Tools', url: `${siteConfig.url}/tools` },
            { name: tool.shortName, url },
          ]),
        )}
      />

      {/* Hero + form */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,black,transparent)] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -left-16 w-[26rem] h-[26rem] bg-indigo-brand/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute -top-10 right-0 w-[22rem] h-[22rem] bg-fuchsia-brand/15 rounded-full blur-3xl animate-blob-slow" />
        </div>
        <Container className="relative pt-14 pb-16 md:pt-16 md:pb-20 text-center">
          <Breadcrumb
            className="mb-10 md:mb-12"
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tools', href: '/tools' },
              { label: tool.shortName },
            ]}
          />

          <div className="reveal max-w-2xl mx-auto">
            <span className={`inline-flex w-20 h-20 rounded-3xl ${tile} items-center justify-center shadow-soft-md`}>
              <Icon className="w-10 h-10" />
            </span>
            <div className="mt-5 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light text-xs font-semibold text-accent-hover">
                <Zap className="w-3.5 h-3.5" /> Free tool, no signup
              </span>
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em] text-text leading-[1.05]">
              {tool.headline}
            </h1>
            <p className="mt-5 text-lg text-text-muted leading-relaxed">
              {tool.subheadline}
            </p>
          </div>

          <div className="mt-10 max-w-2xl mx-auto text-left">
            <Suspense fallback={<div className="h-16 bg-white border border-border rounded-3xl shadow-soft-xl animate-pulse" />}>
              <DownloaderForm
                tool={{
                  slug: tool.slug,
                  platform: tool.platform,
                  name: tool.name,
                  placeholder: tool.placeholder,
                  urlPattern: tool.urlPattern.source,
                }}
              />
            </Suspense>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {perks.map((p) => (
              <div key={p.label} className="flex flex-col items-center text-center gap-2 p-6 bg-white/70 backdrop-blur border border-border-light rounded-2xl shadow-soft">
                <div className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-lg">
                  <p.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-text">{p.label}</h3>
                <p className="text-sm text-text-muted">{p.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How to */}
      <Section variant="white">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              Done In <span className="text-gradient">{tool.howTo.length} Simple Steps.</span>
            </>
          }
        />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tool.howTo.map((step, i) => (
            <div
              key={step.title}
              className="group p-6 bg-white border border-border rounded-2xl shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-brand text-white text-sm font-bold flex items-center justify-center shadow-glow-lg group-hover:scale-105 transition-transform">
                {i + 1}
              </div>
              <h3 className="mt-4 font-bold text-text">{step.title}</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Formats */}
      <Section variant="default">
        <SectionHeading
          eyebrow="Supported formats"
          title={<>Pick Your <span className="text-gradient">Quality.</span></>}
        />
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {tool.supportedFormats.map((f) => (
            <div
              key={f}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-border shadow-soft hover:border-primary/40 hover:shadow-soft-md transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="font-medium text-text">{f}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="white" containerClassName="max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          title={<>Common <span className="text-gradient">Questions.</span></>}
        />
        <div className="mt-12">
          <Accordion items={tool.faq} multiple />
        </div>
      </Section>

      {/* ── Similar Tools (related downloads in the same group) ── */}
      {(() => {
        const meta = getCatalogTool(tool.slug);
        if (!meta) return null;
        const related = catalog
          .filter((t) => t.group === meta.group && t.slug !== tool.slug)
          .slice(0, 6);
        if (related.length === 0) return null;
        return (
          <Section variant="default">
            <SectionHeading
              eyebrow={`More ${meta.group === 'Downloaders' ? 'downloaders' : `${meta.group.toLowerCase()} tools`}`}
              title={<>Try <span className="text-gradient">Another Tool.</span></>}
              description="More from the same category — every tool on SavDown is free, no signup, no watermarks."
            />
            <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((r) => {
                const RIcon = r.icon;
                return (
                  <Link
                    key={r.slug}
                    href={`/tools/${r.slug}`}
                    className="group flex flex-col h-full bg-white border border-border rounded-2xl p-7 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <span className={`w-12 h-12 rounded-xl ${r.tile} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <RIcon className="w-6 h-6" />
                      </span>
                      <ChevronRight className="w-5 h-5 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                    <h3 className="mt-5 font-bold text-text group-hover:text-primary transition-colors">{r.name}</h3>
                    <p className="mt-2 text-sm text-text-muted leading-relaxed">{r.description}</p>
                  </Link>
                );
              })}
            </div>
          </Section>
        );
      })()}

      {/* ── Long-form SEO content (~1,000+ words) ─────────────── */}
      <ToolLongContentSection slug={tool.slug} />
    </>
  );
}
