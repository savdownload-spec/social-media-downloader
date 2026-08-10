'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { Star } from 'lucide-react';
import { Review } from './ReviewCard';

type MarqueeRowProps = {
  items: Review[];
  speed: number;
  direction: 'left' | 'right';
  paused: boolean;
  onPauseChange: (paused: boolean) => void;
};

function MarqueeRow({ items, speed, direction, paused, onPauseChange }: MarqueeRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  const duplicated = [...items, ...items];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const tw = track.scrollWidth / 2;
      setContentWidth(tw);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [items]);

  const duration = contentWidth / speed;

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => onPauseChange(true)}
      onMouseLeave={() => onPauseChange(false)}
    >
      <div
        ref={trackRef}
        className="flex gap-5 will-change-transform marquee-track"
        style={{
          width: 'max-content',
          animation: `marquee-scroll ${duration}s linear infinite`,
          animationDirection: direction === 'right' ? 'reverse' : 'normal',
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {duplicated.map((review, i) => (
          <div
            key={`${review.id}-${i}`}
            className="w-[320px] md:w-[360px] shrink-0"
          >
            <div className="h-full rounded-2xl bg-white border border-border shadow-soft p-5">
              <div className="flex items-center gap-1 text-amber-400 mb-2">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s < review.rating ? 'fill-current' : 'fill-none text-text-subtle'}`} />
                ))}
              </div>
              <p className="text-sm text-text leading-relaxed line-clamp-3 mb-3">
                &ldquo;{review.review}&rdquo;
              </p>
              <div className="flex items-center gap-2.5 pt-3 border-t border-border-light">
                {review.photo ? (
                  <img
                    src={review.photo}
                    alt={review.name}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {review.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text truncate">{review.name}</div>
                  <div className="text-xs text-text-subtle truncate">
                    {[review.role, review.company].filter(Boolean).join(' at ') || 'SavDown User'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ReviewMarqueeProps = {
  reviews: Review[];
};

export function ReviewMarquee({ reviews }: ReviewMarqueeProps) {
  const [pausedRows, setPausedRows] = useState<Set<number>>(new Set());

  const togglePause = useCallback((rowIndex: number, paused: boolean) => {
    setPausedRows((prev) => {
      const next = new Set(prev);
      if (paused) {
        next.add(rowIndex);
      } else {
        next.delete(rowIndex);
      }
      return next;
    });
  }, []);

  if (reviews.length === 0) return null;

  const rowSize = Math.ceil(reviews.length / 3);
  const row1 = reviews.slice(0, rowSize);
  const row2 = reviews.slice(rowSize, rowSize * 2);
  const row3 = reviews.slice(rowSize * 2);

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; }
        }
      `}</style>

      <div className="space-y-5">
        {row1.length > 0 && (
          <MarqueeRow
            items={row1}
            speed={40}
            direction="left"
            paused={pausedRows.has(0)}
            onPauseChange={(p) => togglePause(0, p)}
          />
        )}
        {row2.length > 0 && (
          <MarqueeRow
            items={row2}
            speed={55}
            direction="right"
            paused={pausedRows.has(1)}
            onPauseChange={(p) => togglePause(1, p)}
          />
        )}
        {row3.length > 0 && (
          <MarqueeRow
            items={row3}
            speed={35}
            direction="left"
            paused={pausedRows.has(2)}
            onPauseChange={(p) => togglePause(2, p)}
          />
        )}
      </div>
    </div>
  );
}
