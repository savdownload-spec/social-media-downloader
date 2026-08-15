'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { ReviewMarquee } from '@/components/reviews/ReviewMarquee';
import { Review } from '@/components/reviews/ReviewCard';

export function PricingReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const featuredRes = await fetch('/api/reviews?featured=true&limit=8');
        const featuredData = await featuredRes.json();
        let list: Review[] = featuredData?.ok ? featuredData.data.reviews || [] : [];

        // Featured reviews are curated but may be sparse; top up with the
        // latest approved reviews so the section has a credible amount of
        // social proof without ever inventing data.
        if (!cancelled && list.length < 6) {
          const allRes = await fetch('/api/reviews?limit=8');
          const allData = await allRes.json();
          if (allData?.ok) {
            const seen = new Set(list.map((r) => r.id));
            for (const r of allData.data.reviews || []) {
              if (list.length >= 8) break;
              if (!seen.has(r.id)) {
                list.push(r);
                seen.add(r.id);
              }
            }
          }
        }

        if (!cancelled) setReviews(list.slice(0, 8));
      } catch {
        // Leave reviews empty; ReviewMarquee renders nothing in that case.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (reviews.length === 0) return null;

  return (
    <Section variant="default" id="pricing-reviews">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <SectionHeading
          title={
            <>
              Loved By <span className="text-gradient">Creators</span> Everywhere
            </>
          }
          description="See why creators, students, marketers, and everyday users choose SavDown."
        />
      </div>

      <ReviewMarquee reviews={reviews} />

      <div className="mt-10 text-center">
        <Link
          href="/reviews"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-text bg-white border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-all active:scale-[0.98]"
        >
          See All Reviews <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </Section>
  );
}
