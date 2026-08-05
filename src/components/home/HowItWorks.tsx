'use client';
import { LayoutGrid, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { useTranslation } from '@/i18n';

export function HowItWorks() {
  const t = useTranslation();
  
  const steps = [
    { icon: LayoutGrid, title: t('howItWorks.steps.0.title'), body: t('howItWorks.steps.0.body') },
    { icon: SlidersHorizontal, title: t('howItWorks.steps.1.title'), body: t('howItWorks.steps.1.body') },
    { icon: Sparkles, title: t('howItWorks.steps.2.title'), body: t('howItWorks.steps.2.body') },
  ];

  return (
    <Section variant="white" id="how-it-works">
      <SectionHeading
        eyebrow={t('howItWorks.eyebrow')}
        title={t('howItWorks.title')}
        description={t('howItWorks.description')}
      />

      <div className="mt-16 relative">
        <div className="hidden md:block absolute top-12 left-[calc(100%/(2*3))] right-[calc(100%/(2*3))] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="flex flex-wrap justify-center gap-6">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <div className="relative flex flex-col items-center text-center px-4 w-64">
                <div className="relative w-24 h-24 rounded-3xl bg-white border border-border shadow-soft-md flex items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-glow-lg">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-text text-white text-xs font-bold flex items-center justify-center shadow-soft">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold text-text">{step.title}</h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed max-w-xs">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
