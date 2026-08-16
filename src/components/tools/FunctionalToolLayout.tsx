import { Zap } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { FAQSection } from '@/components/ui/FAQSection';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ShareButton } from '@/components/ui/ShareButton';
import { getCatalogTool, fallbackIcon, catalog } from '@/config/catalog';
import type { CatalogTool } from '@/config/catalog';
import { jsonLd, softwareAppSchema, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { siteConfig } from '@/config/site';
import { functionalToolContent } from '@/config/functionalToolContent';
import Link from 'next/link';

type Props = {
  tool: CatalogTool;
  /** The interactive client component rendered in the hero. */
  children: React.ReactNode;
};

/**
 * Shared layout for non-downloader tools that have a live implementation
 * (image / PDF / QR / utility). Mirrors the hero chrome of ToolPageView but
 * renders the passed-in interactive component instead of the DownloaderForm,
 * and supplies a How-it-works + FAQ block from functionalToolContent.
 */
export function FunctionalToolLayout({ tool, children }: Props) {
  const url = `${siteConfig.url}/tools/${tool.slug}`;
  const groupLabel = tool.group === 'Downloaders' ? 'Social Media Downloaders' : `${tool.group} Tools`;
  const groupHref = `/tools#${tool.group.toLowerCase()}`;
  const Icon = tool.icon ?? fallbackIcon;
  const content = functionalToolContent[tool.slug];

  const related = catalog
    .filter((t) => t.group === tool.group && t.slug !== tool.slug)
    .slice(0, 6);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          softwareAppSchema({ name: tool.name, description: tool.description, url }),
        )}
      />
      {content && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(faqSchema(content.faq))}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', url: siteConfig.url },
            { name: 'Tools', url: `${siteConfig.url}/tools` },
            { name: groupLabel, url: `${siteConfig.url}${groupHref}` },
            { name: tool.name, url },
          ]),
        )}
      />

      {/* Hero + interactive tool */}
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
              { label: tool.name },
            ]}
          />

          <div className="reveal max-w-2xl mx-auto">
            <span className={`inline-flex w-20 h-20 rounded-3xl ${tool.tile} items-center justify-center shadow-soft-md`}>
              <Icon className="w-10 h-10" />
            </span>
            <div className="mt-5 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light text-xs font-semibold text-accent-hover">
                <Zap className="w-3.5 h-3.5" /> Free tool, no signup
              </span>
              <ShareButton url={url} />
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em] text-text leading-[1.05]">
              {tool.name}
            </h1>
            <p className="mt-5 text-lg text-text-muted leading-relaxed">
              {tool.description}
            </p>
          </div>

          <div className="mt-10 max-w-2xl mx-auto text-left">{children}</div>
        </Container>
      </section>

      {/* How it works + FAQ (only if content is configured) */}
      {content && (
        <>
          <Section variant="white">
            <SectionHeading
              eyebrow="How it works"
              title={
                <>
                  Done In <span className="text-gradient">{content.howTo.length} Simple Steps.</span>
                </>
              }
            />
            <div className="mt-14 flex flex-wrap justify-center gap-4">
              {content.howTo.map((step, i) => (
                <div
                  key={step.title}
                  className="group w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33%-0.75rem)] min-w-[200px] max-w-xs p-6 bg-white dark:bg-card border border-border rounded-2xl shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-brand text-white text-sm font-bold flex items-center justify-center shadow-glow-lg group-hover:scale-105 transition-transform">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 font-bold text-text">{step.title}</h3>
                  <p className="mt-2 text-sm text-text-muted leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </Section>

          <FAQSection items={content.faq} variant="default" />
        </>
      )}

      {/* Related tools */}
      {related.length > 0 && (
        <Section variant="white">
          <SectionHeading
            eyebrow={`More ${tool.group === 'Downloaders' ? 'downloaders' : `${tool.group.toLowerCase()} tools`}`}
            title={<>Try <span className="text-gradient">Another Tool.</span></>}
          />
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((r) => {
              const RIcon = r.icon;
              return (
                <Link
                  key={r.slug}
                  href={`/tools/${r.slug}`}
                  className="group flex flex-col h-full bg-white dark:bg-card border border-border rounded-2xl p-7 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
                >
                  <span className={`w-12 h-12 rounded-xl ${r.tile} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <RIcon className="w-6 h-6" />
                  </span>
                  <h3 className="mt-5 font-bold text-text group-hover:text-primary transition-colors">{r.name}</h3>
                  <p className="mt-2 text-sm text-text-muted leading-relaxed">{r.description}</p>
                </Link>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}


