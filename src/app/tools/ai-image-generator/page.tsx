import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Image as ImageIcon, Layers3, ShieldCheck, Sparkles, WandSparkles, Zap } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { AIImageGenerator } from '@/components/tools/AIImageGenerator';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'AI Image Generator Online | Create Images From Text',
  description: 'Create original images from a text prompt with SavDown AI Image Generator. Choose your ratio, quality, and number of images, then download your results.',
  alternates: { canonical: `${siteConfig.url}/tools/ai-image-generator` },
  openGraph: {
    type: 'website',
    url: `${siteConfig.url}/tools/ai-image-generator`,
    title: 'AI Image Generator Online | SavDown',
    description: 'Create images from your ideas with a fast, simple AI image generator built into SavDown.',
    siteName: siteConfig.name,
  },
};

const faq = [
  ['What is an AI image generator?', 'An AI image generator turns a written description into an original image. Describe the subject, mood, style, and composition you want, and SavDown creates a downloadable result.'],
  ['How many SavCredits does an image cost?', 'The current cost is shown next to the Generate Image button before you submit. Cost can vary with image count and quality, so there are no surprises at checkout.'],
  ['Can I use the generated images commercially?', 'Usage rights depend on the configured AI provider and your plan. Review the provider terms for your account before using an image in commercial work.'],
  ['Do I need to install an app?', 'No. The generator runs in your browser at savdown.com/tools/ai-image-generator and works on desktop, tablet, and mobile.'],
  ['What happens if generation fails?', 'SavDown releases or refunds reserved credits when a generation fails. You will see a clear message instead of a raw provider error.'],
];

export default function AIImageGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SavDown AI Image Generator',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: `${siteConfig.url}/tools/ai-image-generator`,
    description: metadata.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="relative overflow-hidden border-b border-border-light bg-surface">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_0%,black,transparent)]" />
        <div className="pointer-events-none absolute -left-28 -top-32 h-96 w-96 rounded-full bg-indigo-brand/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-fuchsia-brand/15 blur-3xl" />
        <Container className="relative py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-10 flex items-center gap-2 text-sm text-text-muted">
            <Link href="/" className="hover:text-primary">Home</Link><span>/</span>
            <Link href="/tools" className="hover:text-primary">Tools</Link><span>/</span>
            <span className="text-text">AI Image Generator</span>
          </nav>
          <div className="mx-auto max-w-3xl text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-brand text-white shadow-glow-lg"><WandSparkles className="h-10 w-10" /></span>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-light px-3 py-1 text-xs font-semibold text-accent-hover"><Zap className="h-3.5 w-3.5" /> Free tool</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-semibold text-text-muted dark:bg-card"><ShieldCheck className="h-3.5 w-3.5" /> Secure generation</span>
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-[-0.04em] text-text md:text-6xl">AI Image Generator</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">Create images from your ideas. Turn a clear text prompt into an original visual, then keep the result inside SavDown.</p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl"><AIImageGenerator /></div>
        </Container>
      </section>

      <Section variant="white">
        <SectionHeading eyebrow="How it works" title={<>Create in <span className="text-gradient">3 simple steps.</span></>} description="A focused text-to-image workflow with transparent credit metering and no unnecessary detours." />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            ['1', 'Describe your idea', 'Write the subject, setting, style, lighting, and details you want to see.'],
            ['2', 'Choose your output', 'Select an aspect ratio, image quality, and the number of images to create.'],
            ['3', 'Download the result', 'Review your images directly on the page, then download or generate another variation.'],
          ].map(([number, title, body]) => <div key={title} className="rounded-2xl border border-border bg-white p-7 shadow-soft dark:bg-card"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand font-bold text-white">{number}</span><h3 className="mt-5 font-bold text-text">{title}</h3><p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p></div>)}
        </div>
      </Section>

      <Section variant="tinted">
        <SectionHeading eyebrow="Built for useful outputs" title={<>A simple generator that stays <span className="text-gradient">out of your way.</span></>} description="SavDown keeps the controls familiar, the cost visible, and the result close to the action." />
        <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
          {[{ icon: ImageIcon, title: 'Prompt-first', body: 'Start with the idea in your head, without learning a complicated creative suite.' }, { icon: Layers3, title: 'Flexible formats', body: 'Make a square post, portrait creative, landscape scene, or another ratio that fits your use.' }, { icon: Check, title: 'Clear outcomes', body: 'See validation, generation, success, and failure states rather than fake progress.' }].map(({ icon: Icon, title, body }) => <div key={title} className="rounded-2xl border border-border bg-white/80 p-7 dark:bg-card"><Icon className="h-7 w-7 text-primary" /><h3 className="mt-5 font-bold text-text">{title}</h3><p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p></div>)}
        </div>
      </Section>

      <Section variant="white">
        <SectionHeading eyebrow="Frequently asked questions" title={<>Questions, <span className="text-gradient">answered.</span></>} />
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-white dark:bg-card">
          {faq.map(([question, answer]) => <details key={question} className="group p-6"><summary className="cursor-pointer list-none pr-8 font-semibold text-text marker:hidden">{question}<span className="float-right text-primary transition-transform group-open:rotate-45">＋</span></summary><p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">{answer}</p></details>)}
        </div>
      </Section>

      <Section variant="dark">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-7 text-center md:flex-row md:text-left"><div><p className="text-sm font-semibold uppercase tracking-wider text-purple-200">Keep creating</p><h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">Make the next idea visible.</h2><p className="mt-3 max-w-xl text-ink-muted">Explore the rest of SavDown’s tools when you are ready to move from inspiration to a finished file.</p></div><Link href="/tools" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 shadow-soft transition hover:-translate-y-0.5">Browse all tools <ArrowRight className="h-4 w-4" /></Link></div>
      </Section>
    </>
  );
}
