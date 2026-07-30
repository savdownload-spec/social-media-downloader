import { Scissors, GraduationCap, Megaphone, Archive } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';

const cases = [
  {
    icon: Scissors,
    title: 'Creators & Editors',
    body: 'Pull clean source clips for edits, remixes, and short-form cuts without a watermark in the way.',
  },
  {
    icon: Megaphone,
    title: 'Marketers',
    body: 'Save reference ads and trending posts to study hooks, pacing, and what is working right now.',
  },
  {
    icon: GraduationCap,
    title: 'Students & Educators',
    body: 'Keep lectures, tutorials, and reference videos for offline study when the connection drops.',
  },
  {
    icon: Archive,
    title: 'Personal Archivists',
    body: 'Back up your own uploads and the moments you never want to lose to an algorithm or a takedown.',
  },
];

export function UseCases() {
  return (
    <Section variant="white" id="use-cases">
      <SectionHeading
        eyebrow="Use cases"
        title={
          <>
            One Tool, A <span className="text-gradient">Lot Of Reasons</span> To Keep It Bookmarked.
          </>
        }
        description="However you work with video, SavDown fits into the moment you need a clean, reliable copy."
      />

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cases.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.05}>
            <div className="group h-full rounded-2xl bg-surface border border-border-light p-7 hover:bg-white hover:shadow-soft-md hover:border-border transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-white border border-border shadow-soft flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <c.icon className="w-6 h-6" />
              </div>
              <h3 className="mt-5 font-bold text-text">{c.title}</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">{c.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
