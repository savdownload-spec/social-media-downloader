'use client';

import { Star, Quote } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { useTranslation } from '@/i18n';

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  seed: string;
};

export function Testimonials() {
  const t = useTranslation();

  const items = t('testimonials.items') as unknown as Testimonial[];

  return (
    <Section variant="default" id="testimonials">
      <SectionHeading
        eyebrow={t('testimonials.eyebrow')}
        title={
          <>
            The Tool People Quietly <span className="text-gradient">{t('testimonials.title')}</span>
          </>
        }
        description={t('testimonials.description')}
      />

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((item, i) => (
          <Reveal key={item.name} delay={i * 0.05}>
            <figure className="h-full flex flex-col rounded-2xl bg-white border border-border shadow-soft hover:shadow-soft-md transition-shadow p-7">
              <Quote className="w-8 h-8 text-primary/25" />
              <blockquote className="mt-4 text-text leading-relaxed flex-1">
                {item.quote}
              </blockquote>
              <div className="mt-5 flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <figcaption className="mt-4 flex items-center gap-3 pt-4 border-t border-border-light">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/${item.seed}/80/80`}
                  alt={item.name}
                  loading="lazy"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-text">{item.name}</div>
                  <div className="text-xs text-text-muted">{item.role}</div>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
