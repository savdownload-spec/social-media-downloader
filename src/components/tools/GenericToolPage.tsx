import Link from 'next/link';
import { Clock, ArrowRight, ArrowUpRight, Bell } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { catalog, type CatalogTool } from '@/config/catalog';
import { jsonLd, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/config/site';

/**
 * Landing page for catalog tools that don't have a live processor yet. Presents
 * the tool clearly (icon, name, description), sets expectations honestly, and
 * routes visitors to related tools that are ready to use.
 */
export function GenericToolPage({ tool }: { tool: CatalogTool }) {
  const Icon = tool.icon;
  const url = `${siteConfig.url}/tools/${tool.slug}`;
  const groupLabel = tool.group === 'Downloaders' ? 'Social Media Downloaders' : `${tool.group} Tools`;
  const groupHref = `/tools#${tool.group.toLowerCase()}`;
  const related = catalog.filter((t) => t.group === tool.group && t.slug !== tool.slug).slice(0, 6);

  return (
    <>
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
            <div className="mt-5 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-xs font-semibold text-primary">
                <Clock className="w-3.5 h-3.5" /> Coming soon
              </span>
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-[-0.03em] text-text leading-[1.05]">
              {tool.name}
            </h1>
            <p className="mt-5 text-lg text-text-muted leading-relaxed">
              {tool.description}
            </p>
            <p className="mt-3 text-sm text-text-subtle">
              We are putting the finishing touches on this tool. It is part of the {tool.group} toolkit
              and will be free to use, with no signup, just like the rest of SavDown.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
              >
                Explore Live Tools <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-text bg-white border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-all active:scale-[0.98]"
              >
                <Bell className="w-4 h-4" /> Request Early Access
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {related.length > 0 && (
        <Section variant="white">
          <SectionHeading
            eyebrow={`More ${tool.group} tools`}
            title={<>Ready To Use <span className="text-gradient">Right Now.</span></>}
          />
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((r) => {
              const RIcon = r.icon;
              return (
                <Reveal key={r.slug}>
                  <Link
                    href={`/tools/${r.slug}`}
                    className="group flex flex-col h-full bg-white border border-border rounded-2xl p-7 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <span className={`w-12 h-12 rounded-xl ${r.tile} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <RIcon className="w-6 h-6" />
                      </span>
                      <ArrowUpRight className="w-5 h-5 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                    <h3 className="mt-5 font-bold text-text group-hover:text-primary transition-colors">{r.name}</h3>
                    <p className="mt-2 text-sm text-text-muted leading-relaxed">{r.description}</p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}


