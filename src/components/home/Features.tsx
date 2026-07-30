import { ShieldCheck, Sparkles, Gauge, BadgeDollarSign, Layers, MonitorSmartphone } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';

const features = [
  {
    icon: Sparkles,
    title: 'No Watermarks, Ever',
    body: 'Every download comes out clean. We never stamp logos, usernames, or badges onto your files.',
  },
  {
    icon: Gauge,
    title: 'Genuinely Fast',
    body: 'Link analysis finishes in under a second and downloads start immediately, even for long 4K clips.',
  },
  {
    icon: ShieldCheck,
    title: 'Private By Design',
    body: 'We stream media through and never store your files or build a history. What you save stays yours.',
  },
  {
    icon: Layers,
    title: 'Every Format You Need',
    body: 'MP4 up to 4K, MP3 audio, GIFs, and full-resolution thumbnails, all from a single paste box.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Free With No Signup',
    body: 'No account, no credit card, and no daily caps. Paste a link and go, as many times as you like.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Works Everywhere',
    body: 'A browser is all you need. SavDown runs the same on phones, tablets, and desktops.',
  },
];

export function Features() {
  return (
    <Section variant="dark" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh-dark pointer-events-none" />
      <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,black,transparent)] pointer-events-none" />

      <div className="relative">
        <SectionHeading
          dark
          eyebrow="Why choose SavDown"
          title={
            <>
              Built To Feel Effortless, <span className="text-gradient-light">Every Single Time.</span>
            </>
          }
          description="The little things add up: no ads pushing you around, no fake download buttons, and no compromise on quality."
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="group h-full rounded-2xl bg-white/[0.04] border border-white/10 p-7 backdrop-blur-sm hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-glow-lg group-hover:scale-105 transition-transform">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
