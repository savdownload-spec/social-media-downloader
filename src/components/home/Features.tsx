'use client';

import { ShieldCheck, Sparkles, Gauge, BadgeDollarSign, Layers, MonitorSmartphone } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';

export function Features() {
  
  const features = [
    { icon: Sparkles, title: 'Lightning Fast', description: 'Download content in seconds with optimized streaming' },
    { icon: ShieldCheck, title: 'Completely Secure', description: 'Your privacy is our priority. No data collection' },
    { icon: Layers, title: 'Unlimited Downloads', description: 'Download as much as you want, completely free' },
    { icon: Gauge, title: 'No Ads', description: 'Clean interface without annoying advertisements' },
    { icon: BadgeDollarSign, title: 'Original Quality', description: 'No re-encoding, no watermarks. Get the source file exactly as it was uploaded.' },
    { icon: MonitorSmartphone, title: 'Any Device', description: 'Works on iPhone, Android, Mac, and PC. No app to install, just use your browser.' },
  ];

  return (
    <Section variant="dark" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
      <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,black,transparent)] pointer-events-none" />

      <div className="relative">
        <SectionHeading
          dark
          eyebrow={"Learn More"}
          title={"Why Choose SavDown?"}
          description={"The little things add up: no ads pushing you around, no fake download buttons, and no compromise on quality."}
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="group h-full rounded-2xl bg-white/[0.04] border border-white/10 p-7 backdrop-blur-sm hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-glow-lg group-hover:scale-105 transition-transform">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">{f.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
