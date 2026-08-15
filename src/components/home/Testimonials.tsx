'use client';

import { useEffect, useState } from 'react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ReviewMarquee } from '@/components/reviews/ReviewMarquee';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { Review } from '@/components/reviews/ReviewCard';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews?featured=true&limit=12')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.ok) setReviews(data.data.reviews || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Section variant="default" id="testimonials">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <SectionHeading
          eyebrow="Loved by SavDown Users"
          title={
            <>
              Real feedback from people using <span className="text-gradient">SavDown</span> every day.
            </>
          }
          description=""
        />
      </div>

      {/* ReviewMarquee itself renders nothing when reviews is empty, so no
          separate empty-state is needed here while the review system is new. */}
      <ReviewMarquee reviews={reviews} />

      <div className="mt-10 text-center">
        <Link
          href="/reviews"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-text bg-white border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-all active:scale-[0.98]"
        >
          See All Reviews <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="mt-16 max-w-2xl mx-auto">
        <ReviewForm />
      </div>
    </Section>
  );
}
