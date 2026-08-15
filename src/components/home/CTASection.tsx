'use client';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { useTranslation } from '@/i18n';

export function CTASection() {
  const t = useTranslation();

  return (
    <Section variant="dark" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
      <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_70%_80%_at_50%_50%,black,transparent)] pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[24rem] bg-primary/20 blur-3xl rounded-full pointer-events-none" />

      <Reveal className="relative">
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white">
            <Sparkles className="w-3.5 h-3.5" /> {t('ctaSection.eyebrow') || 'Free Forever, No Signup, No Limits'}
          </span>
          <h2 className="mt-6 text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            {t('ctaSection.title') || 'Explore The Whole Toolkit.'}
          </h2>
          <p className="mt-4 text-ink-muted text-lg leading-relaxed max-w-xl mx-auto">
            {t('ctaSection.description') || 'Every tool you need, gathered in one place. Browse the full kit and find exactly what you are looking for. No account, no catch.'}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/#tools"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
            >
              {t('ctaSection.buttons.browse') || 'Browse All Tools'} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-white/5 border border-white/15 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              {t('ctaSection.buttons.faq') || 'Read the FAQ'}
            </Link>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
