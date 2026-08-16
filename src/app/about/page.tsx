'use client';
import Link from 'next/link';
import {
  Zap,
  Shield,
  Eye,
  Heart,
  Globe,
  Sparkles,
  Download,
  Image as ImageIcon,
  FileText,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Layers,
  Lock,
  CpuIcon,
  MessageSquare,
  Compass,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export default function AboutPage() {
  return (
    <>
      {/* â”€â”€ 1. Hero Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface/60 via-white to-white dark:from-background dark:via-background dark:to-background pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,black,transparent)] pointer-events-none opacity-60" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] bg-indigo-brand/10 rounded-full blur-3xl pointer-events-none" />

        <Container className="relative">
          <Breadcrumb
            className="mb-10"
            includeSchema
            items={[
              { label: 'Home', href: '/' },
              { label: 'About' },
            ]}
          />
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            <div className="lg:col-span-7 text-center lg:text-left">
              <Reveal>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border-light text-xs font-semibold uppercase tracking-wider text-primary mb-6 shadow-soft">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  About SavDown Toolkit
                </div>
                <h1 className="text-4xl sm:text-6xl font-bold tracking-[-0.03em] text-text leading-[1.08]">
                  Digital Media & AI Utilities, <span className="text-gradient">Refined for Clarity.</span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-text-muted leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
                  SavDown is engineered as a calm, uncompromising workspace for saving media, processing files, and leveraging AI tools,free from ads, popups, and unnecessary clutter.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                  <Link
                    href="/#tools"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
                  >
                    Explore Toolkit <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-text bg-white dark:bg-card border border-border hover:border-primary/40 hover:bg-primary-light transition-all shadow-soft active:scale-[0.98]"
                  >
                    Contact Team
                  </Link>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <Reveal delay={0.15}>
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Bespoke SVG Media & AI Illustration */}
                  <div className="rounded-3xl bg-white dark:bg-card border border-border p-8 shadow-soft-xl relative overflow-hidden">
                    <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-light">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-red-400/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                      </div>
                      <span className="text-xs font-mono text-text-subtle">savdown.core.ai</span>
                    </div>

                    <div className="space-y-3.5">
                      <div className="p-4 rounded-2xl bg-surface border border-border-light flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary">
                            <Download className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text">Media Extraction</p>
                            <p className="text-xs text-text-subtle">Lightning fast stream parsing</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/25">Active</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-surface border border-border-light flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-fuchsia-brand/10 flex items-center justify-center text-fuchsia-600">
                            <Cpu className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text">AI Media Toolkit</p>
                            <p className="text-xs text-text-subtle">Smart generation & enhancement</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/25">Ready</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-surface border border-border-light flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <Lock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text">Zero-Storage Privacy</p>
                            <p className="text-xs text-text-subtle">Files processed in-browser</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface text-text-muted border border-border">100% Secure</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* â”€â”€ 2. Who We Are â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Section variant="white" className="border-t border-border-light">
        <div className="grid lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
          <div className="lg:col-span-5">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-wider text-gradient mb-3 block">
                Who We Are
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text leading-snug">
                Engineered by Creators, for Creators & Power Users.
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-7">
            <Reveal delay={0.1}>
              <div className="p-8 md:p-10 rounded-3xl bg-surface border border-border-light shadow-soft space-y-4 text-text-muted leading-relaxed">
                <p>
                  SavDown was born out of frustration with modern web utilities. We grew tired of download sites riddled with intrusive ads, countdown timers, fake download buttons, and questionable redirects.
                </p>
                <p>
                  We built SavDown to be the exact opposite: an exceptionally fast, ultra-clean, privacy-first hub where professionals, researchers, students, and creators can manage media and files instantly without friction.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* â”€â”€ 3. Our Mission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Section variant="tinted">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-wider text-gradient mb-3 block">
              Our Mission
            </span>
            <blockquote className="text-2xl md:text-4xl font-bold tracking-tight text-text leading-snug">
              &ldquo;To make digital media handling effortless, transparent, and respectful of every user&apos;s time and data.&rdquo;
            </blockquote>
            <p className="mt-6 text-text-muted text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Every feature we ship adheres to a strict standard: zero cognitive load, instant execution, and absolute respect for personal privacy.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* â”€â”€ 4. Our Core Values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Section variant="white">
        <SectionHeading
          eyebrow="Core Principles"
          title="The Pillars of SavDown."
          description="Four non-negotiable standards guiding every line of code we write."
        />
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Eye,
              title: 'Radical Simplicity',
              body: 'No clutter, no popups, no confusing menus. Just paste your link or drop your file and get results instantly.',
            },
            {
              icon: Shield,
              title: 'Uncompromising Privacy',
              body: 'Your files and downloads are never stored or logged on our servers. Processing happens securely and privately.',
            },
            {
              icon: Zap,
              title: 'Extreme Speed',
              body: 'Optimized serverless routing and edge pipelines ensure your downloads and conversions finish in seconds.',
            },
            {
              icon: Heart,
              title: 'User-First Craft',
              body: 'We reject dark patterns and intrusive advertising entirely. Built with the polish of world-class consumer software.',
            },
          ].map((v, i) => {
            const Icon = v.icon;
            return (
              <Reveal key={v.title} delay={i * 0.05}>
                <div className="h-full p-8 rounded-3xl bg-white dark:bg-card border border-border shadow-soft hover:shadow-soft-lg transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center text-primary group-hover:bg-gradient-brand group-hover:text-white transition-all shadow-soft">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="mt-6 text-lg font-bold text-text tracking-tight">{v.title}</h3>
                    <p className="mt-3 text-sm text-text-muted leading-relaxed">{v.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* â”€â”€ 5. What You Can Do â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Section variant="muted">
        <SectionHeading
          eyebrow="Capabilities"
          title="A Comprehensive Toolkit in Your Browser."
          description="Everything you need for media downloading, conversion, compression, and AI utilities."
        />
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Download,
              title: 'Media Downloader',
              desc: 'Save videos, reels, and audio from YouTube, TikTok, Instagram, X, Facebook, and Pinterest in 4K/HD.',
            },
            {
              icon: ImageIcon,
              title: 'Image Utilities',
              desc: 'Batch resize, compress without quality loss, convert formats, and extract high-resolution thumbnails.',
            },
            {
              icon: FileText,
              title: 'PDF & File Tools',
              desc: 'Merge, split, compress PDFs, convert document formats, and clean up messy files instantly.',
            },
            {
              icon: Cpu,
              title: 'AI Media Suite',
              desc: 'Leverage cutting-edge artificial intelligence for smart summarization, text extraction, and media enhancement.',
            },
          ].map((tool, i) => {
            const Icon = tool.icon;
            return (
              <Reveal key={tool.title} delay={i * 0.06}>
                <div className="p-7 rounded-3xl bg-white dark:bg-card border border-border-light shadow-soft hover:border-primary/40 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-text">{tool.title}</h3>
                  <p className="mt-2 text-sm text-text-muted leading-relaxed">{tool.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* â”€â”€ 6. Why Choose SavDown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Section variant="white">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gradient mb-3 block">
                The Advantage
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                Built Differently. Built Better.
              </h2>
              <p className="mt-4 text-text-muted leading-relaxed">
                Most web utilities treat users as ad inventory. We built SavDown as a professional digital workspace designed for speed, reliability, and peace of mind.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Zero registration or software installation required',
                  'High-performance CDN with 99.9% uptime reliability',
                  'Regularly updated platform supporting 30+ popular networks',
                  'Dedicated support team with real human responses',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium text-text">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="p-8 md:p-10 rounded-3xl bg-ink text-white shadow-soft-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] pointer-events-none" />
              <div className="relative space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-accent">
                    <Compass className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Our Vision</h3>
                    <p className="text-xs text-ink-muted">Shaping the future of web tools</p>
                  </div>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">
                  We envision a web where essential digital utilities are universally accessible, lightning fast, and completely free of predatory monetization. SavDown is our step toward that standard.
                </p>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-ink-subtle">
                  <span>VERSION 2.6</span>
                  <span>SECURE EDGE NETWORK</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* â”€â”€ 7. Community & Feedback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Section variant="tinted">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-5">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gradient mb-3 block">
              Community Driven
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              Shaped by Your Suggestions.
            </h2>
            <p className="mt-4 text-text-muted leading-relaxed max-w-xl mx-auto">
              We continuously expand and refine SavDown based on real user feedback. Have an idea for a new tool or platform? Our team reviews every submission.
            </p>
            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-text bg-white dark:bg-card border border-border hover:border-primary/40 hover:bg-primary-light transition-all shadow-soft active:scale-[0.98]"
              >
                Send Us Feedback <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* â”€â”€ 8. Final CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Section variant="dark" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
        <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] pointer-events-none" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[32rem] h-[20rem] bg-primary/20 blur-3xl rounded-full pointer-events-none" />

        <div className="relative text-center max-w-3xl mx-auto">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-wider text-gradient-light inline-block mb-3">
              Get Started Instantly
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] text-white">
              Ready to Simplify Your Workflow?
            </h2>
            <p className="mt-5 text-ink-muted max-w-xl mx-auto leading-relaxed text-base md:text-lg">
              Experience the fastest, cleanest media downloader and AI toolkit on the web. No signup required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/#tools"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
              >
                <Zap className="w-5 h-5" /> Explore All Tools
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}

