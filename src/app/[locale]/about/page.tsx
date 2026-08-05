'use client';
import Link from 'next/link';
import {
  Heart, Shield, Zap, Eye, Globe, Users, Rocket, Star, ArrowRight, Check,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { useTranslation } from '@/i18n';

export default function AboutPage() {
  const t = useTranslation();

  const beliefs = [
    { icon: Eye, title: t('about.beliefsSection.items.0.title'), body: t('about.beliefsSection.items.0.body') },
    { icon: Shield, title: t('about.beliefsSection.items.1.title'), body: t('about.beliefsSection.items.1.body') },
    { icon: Zap, title: t('about.beliefsSection.items.2.title'), body: t('about.beliefsSection.items.2.body') },
    { icon: Heart, title: t('about.beliefsSection.items.3.title'), body: t('about.beliefsSection.items.3.body') },
  ];

  const milestones = [
    { year: '2024', title: t('about.journeySection.milestones.0.title'), body: t('about.journeySection.milestones.0.body') },
    { year: '2025', title: t('about.journeySection.milestones.1.title'), body: t('about.journeySection.milestones.1.body') },
    { year: '2025', title: t('about.journeySection.milestones.2.title'), body: t('about.journeySection.milestones.2.body') },
    { year: '2026', title: t('about.journeySection.milestones.3.title'), body: t('about.journeySection.milestones.3.body') },
  ];

  const stats = [
    { value: '100%', label: t('about.stats.items.0.label') },
    { value: '100%', label: t('about.stats.items.1.label') },
    { value: '0', label: t('about.stats.items.2.label') },
    { value: '4.9', label: t('about.stats.items.3.label') },
  ];

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
              {t('about.hero.eyebrow')}
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.03em] text-text leading-[1.05]">
              {t('about.hero.title')}
            </h1>
            <p className="mt-5 text-lg text-text-muted leading-relaxed max-w-2xl mx-auto">
              {t('about.hero.lead')}
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

      {/* ── Mission & Vision ────────────────── */}
      <Section variant="white">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
                {t('about.mission.eyebrow')}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                {t('about.mission.title')}
              </h2>
              <p className="mt-4 text-text-muted leading-relaxed">
                {t('about.mission.paragraphs.0')}
              </p>
              <p className="mt-4 text-text-muted leading-relaxed">
                {t('about.mission.paragraphs.1')}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-3xl bg-ink text-white p-8 md:p-10 shadow-soft-xl">
              <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] pointer-events-none" />
              <div className="relative grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-5">
                  <Globe className="w-8 h-8 text-gradient-light mb-3" />
                  <h3 className="text-sm font-bold">{t('about.missionHighlights.0.title')}</h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">{t('about.missionHighlights.0.body')}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-5">
                  <Shield className="w-8 h-8 text-gradient-light mb-3" />
                  <h3 className="text-sm font-bold">{t('about.missionHighlights.1.title')}</h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">{t('about.missionHighlights.1.body')}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-5">
                  <Zap className="w-8 h-8 text-gradient-light mb-3" />
                  <h3 className="text-sm font-bold">{t('about.missionHighlights.2.title')}</h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">{t('about.missionHighlights.2.body')}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-5">
                  <Users className="w-8 h-8 text-gradient-light mb-3" />
                  <h3 className="text-sm font-bold">{t('about.missionHighlights.3.title')}</h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">{t('about.missionHighlights.3.body')}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── What We Believe ───────────── */}
      <Section variant="muted">
        <SectionHeading
          eyebrow={t('about.beliefsSection.eyebrow')}
          title={t('about.beliefsSection.title')}
          description={t('about.beliefsSection.description')}
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

      {/* ── Supported Platforms ────────────── */}
      <Section variant="white">
        <SectionHeading
          eyebrow={t('about.platformsSection.eyebrow')}
          title={t('about.platformsSection.title')}
          description={t('about.platformsSection.description')}
        />
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {(t('about.platformsSection.items') as unknown as string[]).map((p) => (
            <Reveal key={p}>
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface border border-border-light text-sm font-medium text-text-muted">
                <Check className="w-3.5 h-3.5 text-accent" />
                {p}
              </span>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Our Journey ────────────────────────── */}
      <Section variant="tinted">
        <SectionHeading
          eyebrow={t('about.journeySection.eyebrow')}
          title={t('about.journeySection.title')}
          description={t('about.journeySection.description')}
        />
        <div className="mt-14 relative">
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
          eyebrow={t('about.teamSection.eyebrow')}
          title={t('about.teamSection.title')}
          description={t('about.teamSection.description')}
        />
        <div className="mt-14 grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { role: t('about.teamSection.members.0.role'), icon: Star, body: t('about.teamSection.members.0.body') },
            { role: t('about.teamSection.members.1.role'), icon: Rocket, body: t('about.teamSection.members.1.body') },
            { role: t('about.teamSection.members.2.role'), icon: Heart, body: t('about.teamSection.members.2.body') },
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
              {t('about.cta.eyebrow')}
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] text-white">
              {t('about.cta.title')}
            </h2>
            <p className="mt-5 text-ink-muted max-w-xl mx-auto leading-relaxed">
              {t('about.cta.description')}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/#tools"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all"
              >
                <Zap className="w-5 h-5" /> {t('about.cta.button.text')}
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
