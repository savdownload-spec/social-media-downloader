'use client';

import Link from 'next/link';
import { ArrowRight, Check, Database, ShieldCheck, Star, Sparkles, Users } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { HeroToolkit } from '@/components/home/HeroToolkit';
import { useTranslation } from '@/i18n';

export function Hero() {
  const t = useTranslation();
  
  const trustBadges = [
    t('features.unlimited'),
    t('features.noAds'),
    t('hero.badges.privacyFirst'),
    t('hero.badges.everyPlatform'),
  ];

  const heroStats = [
    {
      value: '2M+',
      label: t('hero.trusted'),
      detail: 'Creators choose SavDown',
      icon: Users,
      iconClass: 'text-violet-600',
      iconBg: 'bg-violet-50',
    },
    {
      value: '100%',
      label: t('hero.stats.free'),
      detail: 'No paywall, no catch',
      icon: ShieldCheck,
      iconClass: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      value: '0',
      label: t('hero.stats.dataStored'),
      detail: 'Your files stay yours',
      icon: Database,
      iconClass: 'text-sky-600',
      iconBg: 'bg-sky-50',
    },
    {
      value: '4.9',
      label: t('hero.stats.rating'),
      detail: 'Loved by the community',
      icon: Star,
      iconClass: 'text-amber-600',
      iconBg: 'bg-amber-50',
      star: true,
    },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Decorative animated backdrop */}
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_25%,black,transparent)] pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-indigo-brand/25 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-10 -right-24 w-[26rem] h-[26rem] bg-fuchsia-brand/20 rounded-full blur-3xl animate-blob-slow" />
        <div className="absolute -bottom-40 left-1/3 w-[24rem] h-[24rem] bg-primary/20 rounded-full blur-3xl animate-blob" />
      </div>

      <Container className="relative pt-20 pb-24 md:pt-28 md:pb-28">
        <div className="reveal text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur border border-border text-xs font-medium text-text-muted shadow-soft">
            <span className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-current" />
              ))}
            </span>
            {t('hero.trusted')}
          </span>

          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-[-0.03em] text-text leading-[1.03]">
            {t('hero.title')}
          </h1>

          <p className="mt-6 text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/#tools"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all"
            >
              <Sparkles className="w-5 h-5" /> {t('common.getStarted')}
            </Link>
            <Link
              href="/#how-it-works"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-text bg-white border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-colors"
            >
              {t('hero.howItWorks')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {trustBadges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted">
                <span className="w-4 h-4 rounded-full bg-accent-light flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-accent-hover" />
                </span>
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Animated toolkit showcase */}
        <div className="reveal" style={{ animationDelay: '0.12s' }}>
          <HeroToolkit />
        </div>

        {/* Trust proof strip */}
        <div className="reveal mt-14 max-w-4xl mx-auto" style={{ animationDelay: '0.24s' }}>
          <div className="rounded-[1.75rem] border border-border bg-white/70 backdrop-blur shadow-soft p-2.5 md:p-3">
            <div className="flex flex-col gap-3 px-3 pb-2 pt-1 md:flex-row md:items-end md:justify-between md:px-4 md:pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Why users trust SavDown</p>
                <p className="mt-1 text-sm text-text-muted">Simple, private, and built for everyday creators.</p>
              </div>
              <span className="hidden h-px flex-1 bg-gradient-to-r from-border-light via-border to-transparent md:ml-8 md:block" aria-hidden />
            </div>

            <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border-light bg-white/65 md:grid-cols-4">
              {heroStats.map((s, index) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className={`group relative flex min-h-[118px] flex-col justify-between gap-4 p-4 transition-colors duration-200 hover:bg-primary-light/30 md:min-h-[126px] md:p-5 ${index < 2 ? 'border-b border-border-light md:border-b-0' : ''} ${index < heroStats.length - 1 ? 'md:border-r' : ''}`}
                  >
                    <dt className="sr-only">{s.label}</dt>
                    <div className="flex items-start justify-between gap-3">
                      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 ${s.iconBg}`}>
                        <Icon className={`h-4 w-4 ${s.iconClass}`} strokeWidth={1.9} />
                      </div>
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/25 transition-colors duration-200 group-hover:bg-primary" aria-hidden />
                    </div>
                    <div>
                      <dd className="inline-flex items-center gap-1 text-2xl font-bold tracking-tight text-gradient font-display md:text-3xl">
                        {s.value}
                        {s.star && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 md:h-4 md:w-4" />}
                      </dd>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-text-muted">{s.label}</p>
                      <p className="mt-1 text-xs text-text-subtle">{s.detail}</p>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
