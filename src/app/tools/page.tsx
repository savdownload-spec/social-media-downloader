import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Section } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { catalog, toolGroups, isToolAvailable } from '@/config/catalog';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'All Tools',
  description:
    'Browse the full SavDown toolkit: social media downloaders plus image, video, PDF, AI, SEO, and utility tools. All free, no signup.',
  path: '/tools',
  keywords: ['free online tools', 'social media downloader', 'image tools', 'pdf tools', 'ai tools', 'seo tools'],
});

const groupBlurb: Record<string, string> = {
  Downloaders: 'Save videos, reels, photos, audio, and thumbnails from every major platform.',
  Image: 'Remove backgrounds, upscale, compress, resize, and convert images.',
  Video: 'Convert, compress, and repurpose video into the format you need.',
  PDF: 'Merge, split, compress, and convert PDFs and documents.',
  AI: 'Generate thumbnails, titles, captions, hashtags, and more with AI.',
  SEO: 'Create titles, descriptions, tags, keywords, and schema that rank.',
  Utility: 'Handy everyday helpers for creators and developers.',
};

export default function ToolsIndexPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_15%,black,transparent)] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -left-16 w-[26rem] h-[26rem] bg-indigo-brand/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute -top-10 right-0 w-[22rem] h-[22rem] bg-fuchsia-brand/15 rounded-full blur-3xl animate-blob-slow" />
        </div>
        <Container className="relative pt-16 pb-10 md:pt-20 md:pb-14 text-center">
          <Breadcrumb
            className="mb-10"
            includeSchema
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tools' },
            ]}
          />
          <div className="reveal max-w-2xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
              The complete toolkit
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.03em] text-text leading-[1.05]">
              Every Tool, <span className="text-gradient">In One Place.</span>
            </h1>
            <p className="mt-5 text-lg text-text-muted leading-relaxed">
              Downloaders, image and video tools, PDF utilities, AI helpers, and SEO generators.
              All free to use, with no signup and no watermarks.
            </p>
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              {toolGroups.map((g) => (
                <a
                  key={g}
                  href={`#${g.toLowerCase()}`}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-text-muted border border-border hover:border-primary/40 hover:text-text transition-colors"
                >
                  {g}
                </a>
              ))}
            </nav>
          </div>
        </Container>
      </section>

      {toolGroups.map((group, gi) => {
        const items = catalog.filter((t) => t.group === group);
        if (items.length === 0) return null;
        return (
          <Section key={group} variant={gi % 2 === 0 ? 'white' : 'default'} id={group.toLowerCase()}>
            <div className="max-w-2xl mb-12">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text">
                {group === 'Downloaders' ? 'Social Media Downloaders' : `${group} Tools`}
              </h2>
              <p className="mt-2 text-text-muted leading-relaxed">{groupBlurb[group]}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((tool) => {
                const Icon = tool.icon;
                const live = isToolAvailable(tool.slug);
                return (
                  <Reveal key={tool.slug}>
                    <Link
                      href={`/tools/${tool.slug}`}
                      className="group flex flex-col h-full bg-white border border-border rounded-2xl p-7 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <span className={`w-14 h-14 rounded-2xl ${tool.tile} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                          <Icon className="w-7 h-7" />
                        </span>
                        {live ? (
                          <ArrowUpRight className="w-5 h-5 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-primary-light text-primary">Soon</span>
                        )}
                      </div>
                      <h3 className="mt-5 text-base font-bold text-text tracking-tight group-hover:text-primary transition-colors">
                        {tool.name}
                      </h3>
                      <p className="mt-2 text-sm text-text-muted leading-relaxed flex-1">
                        {tool.description}
                      </p>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </Section>
        );
      })}
    </>
  );
}

