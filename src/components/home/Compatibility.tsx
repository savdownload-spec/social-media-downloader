'use client';

import {
  Check,
  Chrome,
  Compass,
  Globe2,
  Laptop,
  MonitorSmartphone,
  Smartphone,
  Zap,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { useTranslation } from '@/i18n';

/**
 * Card structure is fixed; only the heading of each card is translated. The
 * items themselves (Windows, macOS, Chrome…) are product names, which stay
 * as-is in every language.
 */
const compatibilityCards = [
  { id: 'desktop', fallback: 'Desktop', icon: Laptop, items: ['Windows', 'macOS', 'Linux'] },
  { id: 'mobile', fallback: 'Mobile', icon: Smartphone, items: ['iPhone', 'Android', 'iPad'] },
  {
    id: 'browsers',
    fallback: 'Browsers',
    icon: Globe2,
    items: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Brave', 'Opera'],
  },
] as const;

const browserIcons = [Chrome, Compass, Globe2, Globe2, Globe2, Globe2];

const benefitsFallback = [
  'No software required',
  'Works in modern browsers',
  'Mobile friendly',
  'Desktop friendly',
  'Fast browser-based experience',
];

export function Compatibility() {
  const t = useTranslation();

  const benefits = (t('compatibility.benefits') as string[] | undefined) ?? benefitsFallback;

  return (
    <Section variant="default" id="compatibility">
      <SectionHeading
        eyebrow={t('compatibility.eyebrow') || 'Works everywhere'}
        title={
          <>
            {t('compatibility.title') || 'One Tool. Every Device.'}{' '}
            <span className="text-gradient">
              {t('compatibility.titleAccent') || 'Every Browser.'}
            </span>
          </>
        }
        description={
          t('compatibility.description') ||
          'Use SavDown wherever you are. No special software required, just open your browser and download.'
        }
      />

      <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
        {compatibilityCards.map((card, index) => {
          const Icon = card.icon;
          const title = t(`compatibility.cardTitles.${card.id}`) || card.fallback;
          return (
            <Reveal key={card.id} delay={index * 0.08}>
              <article className="group h-full rounded-2xl border border-border bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <span className="rounded-full border border-primary/15 bg-primary-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                    {t('compatibility.ready') || 'Ready'}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold text-text">{title}</h3>
                <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  {card.items.map((item, itemIndex) => {
                    const ItemIcon = card.id === 'browsers' ? browserIcons[itemIndex] : Check;
                    return (
                      <li key={item} className="flex items-center gap-2 text-sm text-text-muted">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                          <ItemIcon className="h-3 w-3" strokeWidth={2.2} />
                        </span>
                        {item}
                      </li>
                    );
                  })}
                </ul>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.12} className="mt-5">
        <div className="grid gap-6 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-light/70 via-white to-white p-6 md:grid-cols-[1.1fr_1fr] md:items-center md:p-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                <MonitorSmartphone className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {t('compatibility.statusEyebrow') || 'Compatibility status'}
                </p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {t('compatibility.statusTitle') || 'Browser-based by design'}
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-6 text-text-muted">
              {t('compatibility.statusBody') ||
                'Nothing to install. Nothing complicated. Just open SavDown and get started.'}
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit, index) => (
              <li
                key={benefit}
                className={`flex items-center gap-2.5 text-sm text-text-muted ${
                  index === benefits.length - 1 ? 'sm:col-span-2' : ''
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent-hover">
                  <Check className="h-3 w-3" strokeWidth={2.8} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <Reveal
        delay={0.16}
        className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-text-subtle"
      >
        <Zap className="h-3.5 w-3.5 text-primary" />
        {t('compatibility.footnote') || 'No downloads. No setup. Just a fast, simple experience.'}
      </Reveal>
    </Section>
  );
}
