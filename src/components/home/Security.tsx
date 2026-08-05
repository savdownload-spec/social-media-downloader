'use client';
import Link from 'next/link';
import { ShieldCheck, EyeOff, ServerOff, Lock, ArrowUpRight } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { useTranslation } from '@/i18n';

export function Security() {
  const t = useTranslation();

  const points = [
    { icon: ServerOff,    title: t('security.points.0.title'), body: t('security.points.0.body') },
    { icon: EyeOff,       title: t('security.points.1.title'), body: t('security.points.1.body') },
    { icon: Lock,         title: t('security.points.2.title'), body: t('security.points.2.body') },
  ];

  const STAT_VALUES = ['0', 'None', 'None', 'HTTPS'];
  const STAT_LABEL_KEYS = [
    'security.zeroRetention.stat0',
    'security.zeroRetention.stat1',
    'security.zeroRetention.stat2',
    'security.zeroRetention.stat3',
  ];

  return (
    <Section variant="white" id="security">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Copy */}
        <Reveal>
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient mb-3 inline-block">
              {t('security.eyebrow')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              {t('security.title')}
            </h2>
            <p className="mt-4 text-text-muted leading-relaxed">
              {t('security.description')}{' '}
              {t('common.readMore') || 'Read exactly how we handle data in our'}{' '}
              <Link href="/privacy" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
                {t('legal.privacy.title') || 'Privacy Policy'}
              </Link>{' '}
              {t('common.and') || 'and'}{' '}
              <Link href="/terms" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
                {t('legal.terms.title') || 'Terms'}
              </Link>
              .
            </p>
            <ul className="mt-8 space-y-4">
              {points.map((p, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center text-accent-hover">
                    <p.icon className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-text">{p.title}</h3>
                    <p className="text-sm text-text-muted mt-0.5">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Visual */}
        <Reveal delay={0.1}>
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-brand opacity-15 blur-3xl rounded-[40px] pointer-events-none" />
            <div className="relative rounded-3xl bg-ink text-white p-8 md:p-10 shadow-soft-xl overflow-hidden">
              <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,black,transparent)] pointer-events-none" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow-lg">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h3 className="mt-6 text-xl font-bold">{t('security.zeroRetention.title')}</h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                  {t('security.zeroRetention.body')}
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {STAT_LABEL_KEYS.map((key, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3">
                      <div className="text-lg font-bold text-white font-display">{STAT_VALUES[i]}</div>
                      <div className="text-xs text-ink-subtle mt-0.5">{t(key)}</div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/privacy"
                  className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-colors"
                >
                  {t('security.zeroRetention.cta')} <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
