import { Suspense } from 'react';
import { CheckCircle2, Zap } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { FAQSection } from '@/components/ui/FAQSection';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ShareButton } from '@/components/ui/ShareButton';
import { DownloaderForm } from './DownloaderForm';
import { ToolLongContentSection } from './ToolLongContent';
import { downloaderPerks as perks } from './toolPerks';
import { getCatalogTool, fallbackIcon } from '@/config/catalog';
import type { Tool } from '@/config/tools';
import { jsonLd, faqSchema, softwareAppSchema, breadcrumbSchema, howToSchema } from '@/lib/seo';
import { siteConfig } from '@/config/site';
import { requireToolGuide } from '@/config/toolGuides';
import { RelatedToolSection } from './RelatedToolSection';

export function ToolPageView({ tool }: { tool: Tool }) {
  const guide = tool.slug === 'youtube-video-downloader' ? undefined : requireToolGuide(tool.slug);
  const pageContent = guide ? { ...tool, description: guide.description, faq: guide.faq, howTo: guide.howTo, supportedFormats: guide.formats } : tool;
  const pagePerks = guide ? guide.trust.map((item, index) => ({ icon: perks[index % perks.length].icon, title: item.title, body: item.description })) : perks;
  const url = `${siteConfig.url}/tools/${tool.slug}`;
  const meta = getCatalogTool(tool.slug);
  const group = meta?.group ?? 'Downloaders';
  const groupLabel = group === 'Downloaders' ? 'Social Media Downloaders' : `${group} Tools`;
  const groupHref = `/tools#${group.toLowerCase()}`;
  const Icon = meta?.icon ?? fallbackIcon;
  const tile = meta?.tile ?? 'bg-primary-light text-primary';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          { ...softwareAppSchema({ name: tool.name, description: pageContent.description, url }), ...(guide ? { offers: undefined, operatingSystem: 'Web browser' } : {}) },
        )}
      />
      {!guide && <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(faqSchema(tool.faq))}
      />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(howToSchema(`How to use ${tool.name}`, pageContent.howTo))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', url: siteConfig.url },
            { name: 'Tools', url: `${siteConfig.url}/tools` },
            { name: groupLabel, url: `${siteConfig.url}${groupHref}` },
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
              { label: groupLabel, href: groupHref },
              { label: tool.shortName },
            ]}
          />

          <div className="reveal max-w-2xl mx-auto">
            <span className={`inline-flex w-20 h-20 rounded-3xl ${tile} items-center justify-center shadow-soft-md`}>
              <Icon className="w-10 h-10" />
            </span>
            <div className="mt-5 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light text-xs font-semibold text-accent-hover">
                <Zap className="w-3.5 h-3.5" /> {guide ? 'Account-based credits' : 'Free tool, no signup'}
              </span>
              <ShareButton url={url} />
            </div>
            <h1 className="mt-5 type-page-title text-text">
              {guide ? tool.name : tool.headline}
            </h1>
            <p className="mt-5 type-body-large text-text-muted">
              {guide?.description ?? tool.subheadline}
            </p>
          </div>

          <div id={guide ? 'tool-interface' : undefined} className="mt-10 max-w-2xl mx-auto text-left scroll-mt-28">
            <Suspense fallback={<div className="h-16 bg-white dark:bg-card border border-border rounded-3xl shadow-soft-xl animate-pulse" />}>
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
            {pagePerks.map((p) => (
              <div key={p.title} className="flex flex-col items-center text-center gap-2 p-6 bg-white/70 dark:bg-card/70 backdrop-blur border border-border-light rounded-2xl shadow-soft">
                <div className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-lg">
                  <p.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-text">{p.title}</h3>
                <p className="text-sm text-text-muted">{p.body}</p>
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
              Done In <span className="text-gradient">{pageContent.howTo.length} Simple Steps.</span>
            </>
          }
        />
        <div className="mt-14 flex flex-wrap justify-center gap-4">
          {pageContent.howTo.map((step, i) => (
            <div
              key={step.title}
              className="group w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] min-w-[200px] max-w-xs p-6 bg-white dark:bg-card border border-border rounded-2xl shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300"
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
          title={guide ? <>Review <span className="text-gradient">Available Outputs.</span></> : <>Pick Your <span className="text-gradient">Quality.</span></>}
        />
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {pageContent.supportedFormats.map((f) => (
            <div
              key={f}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-card border border-border shadow-soft hover:border-primary/40 hover:shadow-soft-md transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="font-medium text-text">{f}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <FAQSection items={pageContent.faq} variant="white" />

      {/* ── Similar Tools (related downloads in the same group) ── */}
      <RelatedToolSection slug={tool.slug} />

      <ToolLongContentSection slug={tool.slug} guide={guide} />
    </>
  );
}


