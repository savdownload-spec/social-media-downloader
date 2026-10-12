'use client';

import { Scissors, GraduationCap, Megaphone, Archive } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';

const ICONS = [Scissors, Megaphone, GraduationCap, Archive];

export function UseCases() {  const items = [{"title":"Creators & Editors","body":"Pull clean source clips for edits, remixes, and short-form cuts without a watermark in the way."},{"title":"Marketers","body":"Save reference ads and trending posts to study hooks, pacing, and what is working right now."},{"title":"Students & Educators","body":"Keep lectures, tutorials, and reference videos for offline study when the connection drops."},{"title":"Personal Archivists","body":"Back up your own uploads and the moments you never want to lose to an algorithm or a takedown."}] as unknown as { title: string; body: string }[];

  return (
    <Section variant="white" id="use-cases">
      <SectionHeading
        eyebrow={"Use Cases"}
        title={
          <>
            {"One Tool, A Lot Of Reasons To Keep It Bookmarked.".split('Lot Of Reasons')[0]}
            <span className="text-gradient">{"Lot Of Reasons"}</span>
            {"One Tool, A Lot Of Reasons To Keep It Bookmarked.".includes('Lot Of Reasons')
              ? "One Tool, A Lot Of Reasons To Keep It Bookmarked.".split('Lot Of Reasons')[1]
              : ''}
          </>
        }
        description={"However you work with video, SavDown fits into the moment you need a clean, reliable copy."}
      />

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {(items || []).map((c, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <Reveal key={c.title} delay={i * 0.05}>
              <div className="group h-full rounded-2xl bg-surface border border-border-light p-7 hover:bg-white dark:hover:bg-card-hover hover:shadow-soft-md hover:border-border transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card border border-border shadow-soft flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-text tracking-tight">{c.title}</h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">{c.body}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
