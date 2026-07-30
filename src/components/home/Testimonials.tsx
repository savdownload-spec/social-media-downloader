import { Star, Quote } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';

const testimonials = [
  {
    quote:
      'I edit short-form for three brands. Grabbing clean, watermark-free clips in seconds saves me hours every single week.',
    name: 'Maya R.',
    role: 'Content editor',
    seed: 'savdown-person-maya',
  },
  {
    quote:
      'Finally a downloader that does not bury the button under ten fake ones. Paste, click, done. It just works.',
    name: 'Daniel K.',
    role: 'Video creator',
    seed: 'savdown-person-daniel',
  },
  {
    quote:
      'I archive lecture recordings and reference reels for my class. The quality is identical to the source every time.',
    name: 'Priya S.',
    role: 'Educator',
    seed: 'savdown-person-priya',
  },
  {
    quote:
      'Runs perfectly on my phone with no app to install. I have saved Reels on the bus more times than I can count.',
    name: 'Tomas L.',
    role: 'Social media manager',
    seed: 'savdown-person-tomas',
  },
];

export function Testimonials() {
  return (
    <Section variant="default" id="testimonials">
      <SectionHeading
        eyebrow="Loved by creators"
        title={
          <>
            The Tool People Quietly <span className="text-gradient">Keep Coming Back To.</span>
          </>
        }
        description="Thousands of creators, marketers, students, and archivists reach for SavDown when they need a clean copy, fast."
      />

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-5">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.05}>
            <figure className="h-full flex flex-col rounded-2xl bg-white border border-border shadow-soft hover:shadow-soft-md transition-shadow p-7">
              <Quote className="w-8 h-8 text-primary/25" />
              <blockquote className="mt-4 text-text leading-relaxed flex-1">
                {t.quote}
              </blockquote>
              <div className="mt-5 flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <figcaption className="mt-4 flex items-center gap-3 pt-4 border-t border-border-light">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/${t.seed}/80/80`}
                  alt={t.name}
                  loading="lazy"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-text">{t.name}</div>
                  <div className="text-xs text-text-muted">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
