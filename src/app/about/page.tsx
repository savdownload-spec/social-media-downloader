import Link from 'next/link';
import {
  Heart, Shield, Zap, Eye, Globe, Users, Rocket, Star, ArrowRight, Check,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'About SavDown',
  description:
    'SavDown is a calm, ad-light social media downloader built by a small team who care about design, privacy, and speed.',
  path: '/about',
});

/* ── data ────────────────────────────────────────────────── */

const beliefs = [
  {
    icon: Eye,
    title: 'Respect Your Attention',
    body: 'No aggressive ads, no dark patterns, no popups. We design tools that help, not distract.',
  },
  {
    icon: Shield,
    title: 'Privacy by Default',
    body: 'Everything runs in your browser. We store nothing, track nothing, and never ask for personal data.',
  },
  {
    icon: Zap,
    title: 'Speed Without Compromise',
    body: 'Paste a link, get your file. No signup walls, no rate limits, no waiting for email confirmations.',
  },
  {
    icon: Heart,
    title: 'Craft Over Growth',
    body: 'We add platforms only when we can do them right — never for the sake of a longer feature list.',
  },
];

const platforms = [
  'YouTube', 'YouTube Shorts', 'TikTok', 'Instagram Reels',
  'Instagram Stories', 'Instagram Photos', 'Facebook', 'Facebook Reels',
  'Pinterest Videos', 'Pinterest Images', 'X (Twitter) Videos', 'X (Twitter) GIFs',
];

const milestones = [
  { year: '2024', title: 'First line of code', body: 'A small team, frustrated by ad-filled downloaders, started building the alternative.' },
  { year: '2025', title: 'Beta launch', body: 'SavDown went live with YouTube, TikTok, and Instagram support — fast, free, and clean.' },
  { year: '2025', title: 'Platform expansion', body: 'Added Facebook, Pinterest, and X. Introduced thumbnail grabbers and MP3 extraction.' },
  { year: '2026', title: 'The toolkit era', body: 'Expanded into Image, Video, PDF, AI, SEO, and Utility categories, all under one roof.' },
];

const stats = [
  { value: '100%', label: 'Free' },
  { value: '100%', label: 'Browser-Based' },
  { value: '0', label: 'Ads Shown' },
  { value: '4.9', label: 'Rating' },
];

/* ── page ────────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_15%,black,transparent)] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -left-16 w-[26rem] h-[26rem] bg-indigo-brand/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute -top-10 right-0 w-[22rem] h-[22rem] bg-fuchsia-brand/15 rounded-full blur-3xl animate-blob-slow" />
        </div>

        <Container className="relative pt-16 pb-10 md:pt-20 md:pb-14 text-center">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
              About SavDown
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.03em] text-text leading-[1.05]">
              Tools Should Feel <span className="text-gradient">Calm.</span>
            </h1>
            <p className="mt-5 text-lg text-text-muted leading-relaxed max-w-2xl mx-auto">
              SavDown started with a simple observation: every downloader we tried was
              plastered with ads, dark patterns, and shady popups. We wanted the
              opposite — a tool that felt like Apple&apos;s calmest apps.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* ── Stats strip ──────────────────────────────────── */}
      <Section variant="default" containerClassName="max-w-4xl">
        <Reveal>
          <dl className="grid grid-cols-2 md:grid-cols-4 rounded-2xl border border-border bg-white/60 backdrop-blur shadow-soft divide-x divide-border-light divide-y md:divide-y-0">
            {stats.map((s) => (
              <div key={s.label} className="px-6 py-8 text-center">
                <dt className="text-3xl md:text-4xl font-display font-bold text-gradient">{s.value}</dt>
                <dd className="mt-1 text-sm text-text-muted">{s.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Section>

      {/* ── Mission & Vision (split panel) ────────────────── */}
      <Section variant="white">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
                Our Mission
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                Make saving content <span className="text-gradient">effortless</span> for everyone.
              </h2>
              <p className="mt-4 text-text-muted leading-relaxed">
                We believe that downloading a video, saving a photo, or extracting audio
                should be as simple as copying a link. No signup, no paywall, no sketchy
                software. Just paste, pick, and save.
              </p>
              <p className="mt-4 text-text-muted leading-relaxed">
                Our vision is a web where every creator, student, researcher, and casual
                user has access to clean, private tools that respect their time and data.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-3xl bg-ink text-white p-8 md:p-10 shadow-soft-xl">
              <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] pointer-events-none" />
              <div className="relative grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-5">
                  <Globe className="w-8 h-8 text-gradient-light mb-3" />
                  <h3 className="text-sm font-bold">Global Access</h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">Available worldwide, no VPN needed, no region locks.</p>
                </div>
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-5">
                  <Shield className="w-8 h-8 text-gradient-light mb-3" />
                  <h3 className="text-sm font-bold">Zero Storage</h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">We never store your files or your personal data.</p>
                </div>
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-5">
                  <Zap className="w-8 h-8 text-gradient-light mb-3" />
                  <h3 className="text-sm font-bold">Instant Results</h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">Most downloads complete in under 5 seconds.</p>
                </div>
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-5">
                  <Users className="w-8 h-8 text-gradient-light mb-3" />
                  <h3 className="text-sm font-bold">Built by Humans</h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">A small indie team, not a faceless corporation.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── What We Believe (values card grid) ───────────── */}
      <Section variant="muted">
        <SectionHeading
          eyebrow="What We Believe"
          title={<>Built on <span className="text-gradient">Principles.</span></>}
          description="Four values that shape every decision we make."
        />
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {beliefs.map((b, i) => {
            const Icon = b.icon;
            return (
              <Reveal key={b.title} delay={i * 0.05}>
                <div className="h-full bg-white border border-border-light p-7 rounded-2xl hover:bg-white hover:shadow-soft-md transition-all">
                  <span className="w-12 h-12 rounded-2xl bg-white border border-border shadow-soft text-primary flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </span>
                  <h3 className="mt-5 text-base font-bold text-text tracking-tight">{b.title}</h3>
                  <p className="mt-2 text-sm text-text-muted leading-relaxed">{b.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ── Supported Platforms (badge strip) ────────────── */}
      <Section variant="white">
        <SectionHeading
          eyebrow="Platforms"
          title={<>Every Platform <span className="text-gradient">You Love.</span></>}
          description="We support the services people actually use — and we add new ones only when we can do them right."
        />
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {platforms.map((p) => (
            <Reveal key={p}>
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface border border-border-light text-sm font-medium text-text-muted">
                <Check className="w-3.5 h-3.5 text-accent" />
                {p}
              </span>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Our Story (timeline) ────────────────────────── */}
      <Section variant="tinted">
        <SectionHeading
          eyebrow="Our Journey"
          title={<>From Idea to <span className="text-gradient">Toolkit.</span></>}
          description="A short history of how SavDown grew from a weekend project into a full toolkit platform."
        />
        <div className="mt-14 relative">
          {/* Connecting line (hidden on mobile) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {milestones.map((m, i) => (
              <Reveal key={m.year} delay={i * 0.08}>
                <div className="relative text-center">
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-text text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="bg-white border border-border-light rounded-2xl p-7 shadow-soft">
                    <p className="text-sm font-bold text-gradient">{m.year}</p>
                    <h3 className="mt-2 text-base font-bold text-text">{m.title}</h3>
                    <p className="mt-2 text-sm text-text-muted leading-relaxed">{m.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Team ─────────────────────────────────────────── */}
      <Section variant="white">
        <SectionHeading
          eyebrow="Who's Behind It"
          title={<>A Small Team, <span className="text-gradient">Big Standards.</span></>}
          description="We are a tight group of designers and engineers who love clean tools. SavDown is funded through an upcoming Pro upgrade — never by selling your data."
        />
        <div className="mt-14 grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { role: 'Design', icon: Star, body: 'Obsessed with clarity. Every pixel earns its place.' },
            { role: 'Engineering', icon: Rocket, body: 'Fast, reliable, and secure. No shortcuts on infrastructure.' },
            { role: 'Support', icon: Heart, body: 'Real humans, real responses. We read every message.' },
          ].map((t, i) => {
            const Icon = t.icon;
            return (
              <Reveal key={t.role} delay={i * 0.05}>
                <div className="text-center p-7">
                  <span className="mx-auto w-16 h-16 rounded-full bg-gradient-brand text-white flex items-center justify-center shadow-glow-lg">
                    <Icon className="w-7 h-7" />
                  </span>
                  <h3 className="mt-5 text-base font-bold text-text">{t.role}</h3>
                  <p className="mt-2 text-sm text-text-muted leading-relaxed">{t.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <Section variant="dark" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
        <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] pointer-events-none" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[32rem] h-[20rem] bg-primary/20 blur-3xl rounded-full pointer-events-none" />

        <div className="relative text-center">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient-light inline-block mb-3">
              Ready to try?
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] text-white">
              Start Saving <span className="text-gradient-light">Today.</span>
            </h2>
            <p className="mt-5 text-ink-muted max-w-xl mx-auto leading-relaxed">
              No signup, no watermarks, no cost. Just paste a link and download.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:shadow-[0_14px_48px_-8px_rgb(124_58_237_/_0.5)] hover:bg-[position:100%_50%] transition-all"
              >
                Browse all tools <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-white/5 border border-white/15 hover:bg-white/10 transition-colors"
              >
                Contact us
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
