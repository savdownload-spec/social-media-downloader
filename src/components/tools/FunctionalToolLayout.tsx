import { CheckCircle2, Sparkles, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { FAQSection } from '@/components/ui/FAQSection';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ShareButton } from '@/components/ui/ShareButton';
import type { CatalogTool } from '@/config/catalog';
import { requireToolGuide } from '@/config/toolGuides';
import { jsonLd, softwareAppSchema, breadcrumbSchema, howToSchema } from '@/lib/seo';
import { siteConfig } from '@/config/site';
import { RelatedToolSection } from './RelatedToolSection';
import { ToolLongContentSection } from './ToolLongContent';

type Props = { tool: CatalogTool; children: ReactNode; unavailable?: boolean };

/** The approved downloader composition, with each processor passed through intact. */
export function FunctionalToolLayout({ tool, children, unavailable = false }: Props) {
  const url = `${siteConfig.url}/tools/${tool.slug}`;
  const groupLabel = tool.group === 'Downloaders' ? 'Social Media Downloaders' : `${tool.group} Tools`;
  const groupHref = `/tools#${tool.group.toLowerCase()}`;
  const Icon = tool.icon;
  const content = requireToolGuide(tool.slug);

  return <>
    {!unavailable && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({
      ...softwareAppSchema({ name: tool.name, description: content.description, url }),
      operatingSystem: 'Web browser',
      applicationCategory: tool.group === 'SEO' || tool.group === 'Utility' ? 'UtilitiesApplication' : 'MultimediaApplication',
      // Usage depends on plan and credits. A free-software Offer would be misleading.
      offers: undefined,
    })} />}
    {!unavailable && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(howToSchema(`How to use ${tool.name}`, content.howTo))} />}
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([
      { name: 'Home', url: siteConfig.url },
      { name: 'Tools', url: `${siteConfig.url}/tools` },
      { name: groupLabel, url: `${siteConfig.url}${groupHref}` },
      { name: tool.name, url },
    ]))} />

    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,black,transparent)] pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 -left-16 w-[26rem] h-[26rem] bg-indigo-brand/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute -top-10 right-0 w-[22rem] h-[22rem] bg-fuchsia-brand/15 rounded-full blur-3xl animate-blob-slow" />
      </div>
      <Container className="relative pt-14 pb-16 md:pt-16 md:pb-20 text-center">
        <Breadcrumb className="mb-10 md:mb-12" items={[
          { label: 'Home', href: '/' }, { label: 'Tools', href: '/tools' },
          { label: groupLabel, href: groupHref }, { label: tool.name },
        ]} />
        <div className="reveal max-w-2xl mx-auto">
          <span className={`inline-flex w-20 h-20 rounded-3xl ${tool.tile} items-center justify-center shadow-soft-md`}><Icon className="w-10 h-10" /></span>
          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light text-xs font-semibold text-accent-hover"><Zap className="w-3.5 h-3.5" />{unavailable ? 'Processor not available' : 'Browser-based tool'}</span>
            <ShareButton url={url} />
          </div>
          <h1 className="mt-5 type-page-title text-text">{tool.name}</h1>
          <p className="mt-5 type-body-large text-text-muted">{content.description}</p>
        </div>
        <div id="tool-interface" className={`mt-10 mx-auto text-left scroll-mt-28 ${tool.slug === 'ai-image-generator' || tool.slug === 'ai-thumbnail-generator' ? 'max-w-4xl' : 'max-w-2xl'}`}>{children}</div>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {content.trust.map((item) => <div key={item.title} className="flex flex-col items-center text-center gap-2 p-6 bg-white/70 dark:bg-card/70 backdrop-blur border border-border-light rounded-2xl shadow-soft">
            <div className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-lg"><Sparkles className="w-5 h-5 text-white" /></div>
            <h2 className="text-sm font-bold text-text">{item.title}</h2>
            <p className="text-sm text-text-muted">{item.description}</p>
          </div>)}
        </div>
      </Container>
    </section>
    <Section id="how-it-works" className="scroll-mt-28" variant="white">
      <SectionHeading eyebrow="How it works" title={<>Done In <span className="text-gradient">{content.howTo.length} Simple Steps.</span></>} />
      <div className="mt-14 flex flex-wrap justify-center gap-4">
        {content.howTo.map((step, index) => <div key={step.title} className="group w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] min-w-[200px] max-w-xs p-6 bg-white dark:bg-card border border-border rounded-2xl shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand text-white text-sm font-bold flex items-center justify-center shadow-glow-lg group-hover:scale-105 transition-transform">{index + 1}</div>
          <h3 className="mt-4 font-bold text-text">{step.title}</h3>
          <p className="mt-2 text-sm text-text-muted leading-relaxed">{step.body}</p>
        </div>)}
      </div>
    </Section>
    <Section id="supported-capabilities" className="scroll-mt-28" variant="default">
      <SectionHeading eyebrow="Supported formats and capabilities" title={<>Know Your <span className="text-gradient">Output Options.</span></>} />
      <div className="mt-12 flex flex-wrap justify-center gap-3">
        {content.formats.map((format) => <div key={format} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-card border border-border shadow-soft hover:border-primary/40 hover:shadow-soft-md transition-all">
          <CheckCircle2 className="w-4 h-4 text-accent shrink-0" /><span className="font-medium text-text">{format}</span>
        </div>)}
      </div>
    </Section>
    <FAQSection items={content.faq} variant="white" />
    <RelatedToolSection slug={tool.slug} />
    <ToolLongContentSection slug={tool.slug} guide={content} />
  </>;
}
