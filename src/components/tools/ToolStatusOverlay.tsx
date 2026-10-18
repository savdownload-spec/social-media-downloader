import Link from 'next/link';
import { Clock, Wrench, XCircle, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { catalog, type CatalogTool } from '@/config/catalog';

interface ToolStatusOverlayProps {
  status: string;
  toolName: string;
  tool?: CatalogTool;
}

/**
 * Renders a visually distinct status page for tools that are not currently
 * LIVE. Three variants: COMING_SOON, MAINTENANCE, and DISABLED. Each shows
 * the tool name, an appropriate icon/badge/message, and a related-tools grid
 * so visitors can still find useful tools.
 */
export function ToolStatusOverlay({ status, toolName, tool }: ToolStatusOverlayProps) {
  const related = tool
    ? catalog.filter((t) => t.group === tool.group && t.slug !== tool.slug).slice(0, 6)
    : [];

  const groupLabel = tool
    ? tool.group === 'Downloaders'
      ? 'Social Media Downloaders'
      : `${tool.group} Tools`
    : 'Tools';
  const groupHref = tool ? `/tools#${tool.group.toLowerCase()}` : '/tools';

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Tools', href: '/tools' },
    ...(tool ? [{ label: groupLabel, href: groupHref }] : []),
    { label: toolName },
  ];

  if (status === 'COMING_SOON') {
    return (
      <>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,black,transparent)] pointer-events-none" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div className="absolute -top-24 -left-16 w-[26rem] h-[26rem] bg-indigo-brand/20 rounded-full blur-3xl animate-blob" />
            <div className="absolute -top-10 right-0 w-[22rem] h-[22rem] bg-fuchsia-brand/15 rounded-full blur-3xl animate-blob-slow" />
          </div>

          <Container className="relative pt-14 pb-16 md:pt-16 md:pb-20 text-center">
            <Breadcrumb className="mb-10 md:mb-12" items={breadcrumbItems} />

            <div className="reveal max-w-2xl mx-auto">
              {tool ? (
                <span className={`inline-flex w-20 h-20 rounded-3xl ${tool.tile} items-center justify-center shadow-soft-md`}>
                  <tool.icon className="w-10 h-10" />
                </span>
              ) : (
                <span className="inline-flex w-20 h-20 rounded-3xl bg-primary-light text-primary items-center justify-center shadow-soft-md">
                  <Clock className="w-10 h-10" />
                </span>
              )}
              <div className="mt-5 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-xs font-semibold text-primary">
                  <Clock className="w-3.5 h-3.5" /> Coming soon
                </span>
              </div>
              <h1 className="mt-5 type-page-title text-text">{toolName}</h1>
              {tool && (
                <p className="mt-5 type-body-large text-text-muted">{tool.description}</p>
              )}
              <p className="mt-3 text-sm text-text-subtle">
                We&rsquo;re putting the finishing touches on this tool. Check back soon — it will be
                free to use, with no signup required.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/tools"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
                >
                  Explore Live Tools <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </Container>
        </section>

        <RelatedTools related={related} group={tool?.group} />
      </>
    );
  }

  if (status === 'MAINTENANCE') {
    return (
      <>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,black,transparent)] pointer-events-none" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div className="absolute -top-24 -left-16 w-[26rem] h-[26rem] bg-amber-500/15 rounded-full blur-3xl animate-blob" />
            <div className="absolute -top-10 right-0 w-[22rem] h-[22rem] bg-orange-500/10 rounded-full blur-3xl animate-blob-slow" />
          </div>

          <Container className="relative pt-14 pb-16 md:pt-16 md:pb-20 text-center">
            <Breadcrumb className="mb-10 md:mb-12" items={breadcrumbItems} />

            <div className="reveal max-w-2xl mx-auto">
              <span className="inline-flex w-20 h-20 rounded-3xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 items-center justify-center shadow-soft-md">
                <Wrench className="w-10 h-10" />
              </span>
              <div className="mt-5 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Wrench className="w-3.5 h-3.5" /> Under Maintenance
                </span>
              </div>
              <h1 className="mt-5 type-page-title text-text">{toolName}</h1>
              <p className="mt-5 type-body-large text-text-muted">
                This tool is temporarily under maintenance. Please check back soon.
              </p>
              <p className="mt-3 text-sm text-text-subtle">
                We&rsquo;re working to get everything back up as quickly as possible. In the
                meantime, explore the other tools available below.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/tools"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
                >
                  Browse Other Tools <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </Container>
        </section>

        <RelatedTools related={related} group={tool?.group} />
      </>
    );
  }

  // DISABLED (and any other unknown blocked state)
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,black,transparent)] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -left-16 w-[26rem] h-[26rem] bg-rose-500/15 rounded-full blur-3xl animate-blob" />
          <div className="absolute -top-10 right-0 w-[22rem] h-[22rem] bg-red-500/10 rounded-full blur-3xl animate-blob-slow" />
        </div>

        <Container className="relative pt-14 pb-16 md:pt-16 md:pb-20 text-center">
          <Breadcrumb className="mb-10 md:mb-12" items={breadcrumbItems} />

          <div className="reveal max-w-2xl mx-auto">
            <span className="inline-flex w-20 h-20 rounded-3xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400 items-center justify-center shadow-soft-md">
              <XCircle className="w-10 h-10" />
            </span>
            <div className="mt-5 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/15 text-xs font-semibold text-red-600 dark:text-red-400">
                <XCircle className="w-3.5 h-3.5" /> Unavailable
              </span>
            </div>
            <h1 className="mt-5 type-page-title text-text">{toolName}</h1>
            <p className="mt-5 type-body-large text-text-muted">
              This tool is currently unavailable.
            </p>
            <p className="mt-3 text-sm text-text-subtle">
              Please explore the other tools available on SavDown.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
              >
                Browse Other Tools <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <RelatedTools related={related} group={tool?.group} />
    </>
  );
}

function RelatedTools({ related, group }: { related: CatalogTool[]; group?: string }) {
  if (related.length === 0) return null;
  return (
    <Section variant="white">
      <SectionHeading
        eyebrow={group ? `More ${group} tools` : 'More tools'}
        title={<>Ready To Use <span className="text-gradient">Right Now.</span></>}
      />
      <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {related.map((r) => (
          <Reveal key={r.slug}>
            <Link
              href={`/tools/${r.slug}`}
              className="group flex flex-col h-full bg-white dark:bg-card border border-border rounded-2xl p-7 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <span className={`w-12 h-12 rounded-xl ${r.tile} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <r.icon className="w-6 h-6" />
                </span>
                <ArrowUpRight className="w-5 h-5 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
              <h3 className="mt-5 font-bold text-text group-hover:text-primary transition-colors">{r.name}</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">{r.description}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
