import { LayoutGrid, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';

const steps = [
  {
    icon: LayoutGrid,
    title: 'Pick Your Tool',
    body: 'Open the tool that fits the job, from video and audio to photos and thumbnails, all in one place.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Choose Your Options',
    body: 'Set the format, quality, or output you want. Everything is detected and set up for you automatically.',
  },
  {
    icon: Sparkles,
    title: 'Get It Instantly',
    body: 'Your result is ready in seconds and saved straight to your device. No watermark, no waiting room.',
  },
];

export function HowItWorks() {
  return (
    <Section variant="white" id="how-it-works">
      <SectionHeading
        eyebrow="How it works"
        title={
          <>
            Get What You Need In <span className="text-gradient">Three Simple Steps.</span>
          </>
        }
        description="No apps to install and no accounts to create. Every tool in the kit follows the same quick, friendly flow."
      />

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {/* connecting line on desktop */}
        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        {steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.08}>
            <div className="relative flex flex-col items-center text-center px-4">
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
    </Section>
  );
}
