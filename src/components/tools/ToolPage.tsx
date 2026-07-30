import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircle2, ChevronRight, Zap, Lock, Sparkles } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { DownloaderForm } from './DownloaderForm';
import { HeroShowcase } from '@/components/home/HeroShowcase';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { platformBrand } from '@/config/platforms';
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
            { name: 'Tools', url: `${siteConfig.url}/#tools` },
            { name: tool.shortName, url },
          ]),
        )}
      />

      {/* Hero + form */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_30%_20%,black,transparent)] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -left-16 w-[26rem] h-[26rem] bg-indigo-brand/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute -top-10 right-0 w-[22rem] h-[22rem] bg-fuchsia-brand/15 rounded-full blur-3xl animate-blob-slow" />
        </div>
        <Container className="relative pt-14 pb-14 md:pt-20 md:pb-20">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-1 text-xs text-text-muted">
              <li><Link href="/" className="hover:text-text">Home</Link></li>
              <li><ChevronRight className="w-3 h-3" /></li>
              <li><Link href="/#tools" className="hover:text-text">Tools</Link></li>
              <li><ChevronRight className="w-3 h-3" /></li>
              <li className="text-text">{tool.shortName}</li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-12 h-12 rounded-2xl ${platformBrand[tool.platform].tile} flex items-center justify-center text-white shadow-soft-md`}>
                <PlatformIcon platform={tool.platform} className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-text-muted capitalize">{tool.platform} downloader</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em] text-text leading-[1.03]">
              {tool.headline}
            </h1>
            <p className="mt-5 text-lg text-text-muted leading-relaxed max-w-2xl">
              {tool.subheadline}
            </p>
          </div>

          <div className="mt-10 max-w-2xl">
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

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
            {perks.map((p) => (
              <div key={p.label} className="flex gap-3 items-start p-5 bg-white/70 backdrop-blur border border-border-light rounded-2xl shadow-soft">
                <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0 shadow-glow-lg">
                  <p.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">{p.label}</h3>
                  <p className="text-sm text-text-muted mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <HeroShowcase
            platform={tool.platform}
            title={`${tool.shortName}, saved in seconds`}
            author={`savdown.com · ${tool.platform}`}
            seed={tool.slug}
            floating={false}
          />
        </Container>
      </section>

      {/* How to */}
      <section className="py-24 bg-white border-y border-border-light">
        <Container>
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              Save It In {tool.howTo.length} Simple Steps.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </Container>
      </section>

      {/* Formats */}
      <section className="py-24">
        <Container>
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Supported formats</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              Pick Your Quality.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
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
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white border-y border-border-light">
        <Container className="max-w-3xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              Common Questions.
            </h2>
          </div>
          <div className="space-y-3">
            {tool.faq.map((f) => (
              <details
                key={f.question}
                className="group bg-white border border-border rounded-2xl overflow-hidden shadow-soft hover:border-primary/30 transition-colors [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer font-semibold text-text">
                  {f.question}
                  <ChevronRight className="w-5 h-5 text-primary transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-6 text-text-muted leading-relaxed">
                  {f.answer}
                </div>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
