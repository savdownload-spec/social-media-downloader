'use client';

import { useState, useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { ReviewMarquee } from '@/components/reviews/ReviewMarquee';
import { Review } from '@/components/reviews/ReviewCard';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'google', label: 'Google' },
  { key: 'trustpilot', label: 'Trustpilot' },
  { key: 'producthunt', label: 'Product Hunt' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'g2', label: 'G2' },
  { key: 'x', label: 'X' },
  { key: 'linkedin', label: 'LinkedIn' },
] as const;

export function ReviewsClient({
  searchParams,
}: {
  searchParams: { review?: string; filter?: string };
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const highlightId = searchParams.review;
  const activeFilter = searchParams.filter || 'all';
  const initialVisible = 12;
  const [visibleCount, setVisibleCount] = useState(initialVisible);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/reviews?platform=${activeFilter}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.ok) {
          setReviews(data.data.reviews || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFilter]);

  useEffect(() => {
    setVisibleCount(initialVisible);
  }, [activeFilter, initialVisible]);

  const featured = reviews.filter((r) => r.featured);
  const visible = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 8, reviews.length));
  };

  return (
    <>
      <Section variant="default" className="pt-16 md:pt-20">
        <Container>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
              Reviews
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              What People Say About <span className="text-gradient">SavDown</span>
            </h1>
            <p className="mt-4 text-text-muted leading-relaxed">
              Real experiences from creators, professionals and everyday users.
            </p>
          </div>

          {!loading && featured.length > 0 && (
            <div className="mb-12">
              <ReviewMarquee reviews={featured} />
            </div>
          )}

          {FILTERS.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={`/reviews?filter=${f.key}${highlightId ? `&review=${highlightId}` : ''}`}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] ${
                    activeFilter === f.key
                      ? 'bg-text text-white dark:bg-primary shadow-soft-md'
                      : 'bg-white dark:bg-card text-text-muted border border-border hover:border-primary/40 hover:text-text'
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-surface animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {visible.map((review) => (
                  <div
                    key={review.id}
                    id={`review-${review.id}`}
                    className={highlightId === review.id ? 'ring-2 ring-primary rounded-2xl' : ''}
                  >
                    <ReviewCard review={review} />
                  </div>
                ))}
              </div>

              {reviews.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-text-muted">No reviews yet. Be the first to share your experience!</p>
                </div>
              )}

              {hasMore && (
                <div className="mt-12 text-center">
                  <button
                    onClick={loadMore}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
                  >
                    Load More Reviews <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </Container>
      </Section>

      <Section variant="white">
        <Container>
          <div className="max-w-2xl mx-auto">
            <ReviewForm />
          </div>
        </Container>
      </Section>
    </>
  );
}

