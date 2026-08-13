'use client';

import Link from 'next/link';
import { ArrowUpRight, EyeOff, Lock, ServerOff, ShieldCheck } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { useTranslation } from '@/i18n';

export function Security() {
  const t = useTranslation();

  const points = [
    { icon: ServerOff, title: t('security.points.0.title'), body: t('security.points.0.body') },
    { icon: EyeOff, title: t('security.points.1.title'), body: t('security.points.1.body') },
    { icon: Lock, title: t('security.points.2.title'), body: t('security.points.2.body') },
  ];

  const statValues = ['0', 'None', 'None', 'HTTPS'];
  const statLabelKeys = [
    'security.zeroRetention.stat0',
    'security.zeroRetention.stat1',
    'security.zeroRetention.stat2',
    'security.zeroRetention.stat3',
  ];

  return (
    <Section variant="white" id="security">
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-white via-white to-accent-light/30 px-6 py-14 shadow-soft md:px-10 lg:px-14 lg:py-20">
        <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(390px,.78fr)] lg:gap-20">
          <Reveal>
            <div className="max-w-2xl">
              <div className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <span className="h-px w-8 bg-primary/60" />
                {t('security.eyebrow')}
              </div>
              <h2 className="max-w-xl text-4xl font-bold leading-[0.98] tracking-[-0.055em] text-text md:text-6xl">
                Your Content <span className="text-gradient">Stays Yours.</span>
              </h2>
              <p className="mt-7 max-w-lg text-base leading-7 text-text-muted">
                {t('security.description')}{' '}
                <Link href="/privacy" className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-primary-hover">
                  {t('legal.privacy.title') || 'Privacy Policy'}
                </Link>{' '}
                {t('common.and') || 'and'}{' '}
                <Link href="/terms" className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-primary-hover">
                  {t('legal.terms.title') || 'Terms'}
                </Link>
                .
              </p>

              <div className="mt-10 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2">
                {points.map((point, index) => (
                  <div key={index} className="group flex gap-3 border-t border-border/70 pt-4">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent-hover ring-1 ring-accent/10 transition-transform duration-300 group-hover:-translate-y-0.5">
                      <point.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-text">{point.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-text-muted">{point.body}</p>
                    </div>
                  </div>
                ))}
                <div className="group flex gap-3 border-t border-border/70 pt-4">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent-hover ring-1 ring-accent/10 transition-transform duration-300 group-hover:-translate-y-0.5">
                    <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-text">Privacy by design</h3>
                    <p className="mt-1 text-xs leading-5 text-text-muted">We keep unnecessary collection and retention to a minimum.</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mx-auto w-full max-w-md lg:ml-auto">
              <div className="absolute -inset-8 rounded-[3rem] bg-gradient-brand opacity-20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white shadow-soft-xl md:p-8">
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10 shadow-[0_0_0_22px_rgba(255,255,255,0.025),0_0_0_44px_rgba(255,255,255,0.02)]" />
                <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />

                <div className="relative flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                  <span>Privacy by design</span>
                  <span className="flex items-center gap-1.5 text-emerald-300"><i className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,0.12)]" /> Active</span>
                </div>
                <div className="relative mt-12 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-lg">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle">Privacy status</p>
                    <h3 className="mt-1 text-2xl font-bold tracking-tight">Protected</h3>
                  </div>
                </div>
                <div className="relative mt-7 flex items-center gap-4 border-y border-white/10 py-4">
                  <div><div className="font-display text-2xl font-bold">04</div><div className="mt-1 text-[10px] text-ink-subtle">privacy principles</div></div>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[86%] rounded-full bg-gradient-brand" /></div>
                </div>
                <div className="relative divide-y divide-white/[0.08]">
                  {statLabelKeys.map((key, index) => (
                    <div key={key} className="flex items-center justify-between py-3 text-xs">
                      <span className="text-ink-subtle">{t(key)}</span>
                      <span className="font-semibold">{statValues[index]} <em className="ml-1 text-[9px] font-normal not-italic text-emerald-300">clear</em></span>
                    </div>
                  ))}
                </div>
                <Link href="/privacy" className="relative mt-6 flex items-center justify-between text-xs font-medium text-white/80 transition-colors hover:text-white">
                  <span>{t('security.zeroRetention.cta')}</span><ArrowUpRight className="h-4 w-4 text-primary-light" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
