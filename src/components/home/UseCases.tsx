'use client';

import { Scissors, GraduationCap, Megaphone, Archive } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { useTranslation } from '@/i18n';

const ICONS = [Scissors, Megaphone, GraduationCap, Archive];

export function UseCases() {
  const t = useTranslation();
  const items = t('useCases.items') as unknown as { title: string; body: string }[];

  return (
    <Section variant="white" id="use-cases">
      <SectionHeading
        eyebrow={t('useCases.eyebrow')}
        title={
          <>
            {t('useCases.title').split('Lot Of Reasons')[0]}
            <span className="text-gradient">{t('useCases.titleHighlight') || 'Lot Of Reasons'}</span>
            {t('useCases.title').includes('Lot Of Reasons')
              ? t('useCases.title').split('Lot Of Reasons')[1]
              : ''}
          </>
        }
        description={t('useCases.description')}
      />

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {(items || []).map((c, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <Reveal key={c.title} delay={i * 0.05}>
              <div className="group h-full rounded-2xl bg-surface border border-border-light p-7 hover:bg-white hover:shadow-soft-md hover:border-border transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-white border border-border shadow-soft flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 font-bold text-text">{c.title}</h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">{c.body}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
