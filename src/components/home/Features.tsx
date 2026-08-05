'use client';

import { ShieldCheck, Sparkles, Gauge, BadgeDollarSign, Layers, MonitorSmartphone } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { useTranslation } from '@/i18n';

export function Features() {
  const t = useTranslation();
  
  const featureKeys = [
    { icon: Sparkles, titleKey: 'features.fast', descKey: 'features.fastDesc' },
    { icon: ShieldCheck, titleKey: 'features.secure', descKey: 'features.secureDesc' },
    { icon: Layers, titleKey: 'features.unlimited', descKey: 'features.unlimitedDesc' },
    { icon: Gauge, titleKey: 'features.noAds', descKey: 'features.noAdsDesc' },
    { icon: BadgeDollarSign, titleKey: 'features.quality', descKey: 'features.qualityDesc' },
    { icon: MonitorSmartphone, titleKey: 'features.anyDevice', descKey: 'features.anyDeviceDesc' },
  ];

  return (
    <Section variant="dark" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
      <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,black,transparent)] pointer-events-none" />

      <div className="relative">
        <SectionHeading
          dark
          eyebrow={t('common.learnMore')}
          title={t('features.title')}
          description={t('features.subtitle')}
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureKeys.map((f, i) => (
            <Reveal key={f.titleKey} delay={i * 0.05}>
              <div className="group h-full rounded-2xl bg-white/[0.04] border border-white/10 p-7 backdrop-blur-sm hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-glow-lg group-hover:scale-105 transition-transform">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{t(f.titleKey)}</h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">{t(f.descKey)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
