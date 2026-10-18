import Link from 'next/link';

type Props = {
  averageRating: number | null;
  totalApproved: number;
  className?: string;
};

// SavDown brand purple (#7c3aed = rgb(124,58,237))
const FILLED_COLOR = '#7c3aed';
const EMPTY_COLOR = '#d1d5db';

/**
 * A single 5-pointed star SVG icon, rendered at the given size.
 * The star uses a standard polygon path inside a square viewBox.
 */
function StarIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    >
      <path fill="currentColor" d="M12 2l2.9 6.26L22 9.27l-5 5.14 1.18 7.09L12 18.26l-6.18 3.24L7 14.41 2 9.27l7.1-1.01L12 2z" />
    </svg>
  );
}

/**
 * Renders one star position: fully filled, fully empty, or partial fill
 * using a two-layer clip technique (grey base + brand-colour overlay
 * clipped to fillPercent% width).
 */
function Star({ fillPercent }: { fillPercent: number }) {
  const size = 22;

  if (fillPercent <= 0) {
    return (
      <span style={{ color: EMPTY_COLOR, display: 'inline-flex' }}>
        <StarIcon size={size} />
      </span>
    );
  }

  if (fillPercent >= 100) {
    return (
      <span style={{ color: FILLED_COLOR, display: 'inline-flex' }}>
        <StarIcon size={size} />
      </span>
    );
  }

  // Partial: grey base + brand overlay clipped to fillPercent% width
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Grey base */}
      <span style={{ position: 'absolute', inset: 0, color: EMPTY_COLOR }}>
        <StarIcon size={size} />
      </span>
      {/* Brand-colour overlay clipped to fillPercent% */}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          width: `${fillPercent}%`,
          overflow: 'hidden',
          color: FILLED_COLOR,
        }}
      >
        <StarIcon size={size} />
      </span>
    </span>
  );
}

/**
 * Native SavDown rating widget. Shows the average rating, a five-star row
 * using SavDown's brand purple, and a clickable approved-review count.
 *
 * Props are unchanged from the previous implementation so all call sites
 * (Testimonials, ReviewsClient, PricingReviews) continue to work as-is.
 */
export function ReviewSummaryBadge({
  averageRating,
  totalApproved,
  className = '',
}: Props) {
  const hasReviews = totalApproved > 0 && averageRating !== null;
  const rating = averageRating ?? 0;

  // Compute fill percentage for each of the five star positions
  const starFills = [0, 1, 2, 3, 4].map((i) => {
    const raw = (rating - i) * 100;
    return Math.min(100, Math.max(0, raw));
  });

  if (!hasReviews) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`} aria-label="No reviews yet">
        {/* Five empty grey stars */}
        <span className="flex items-center gap-0.5" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} fillPercent={0} />
          ))}
        </span>
        <span className="text-sm text-text-muted">No reviews yet</span>
      </div>
    );
  }

  const reviewLabel = `${totalApproved.toLocaleString()} review${totalApproved !== 1 ? 's' : ''}`;
  const ariaLabel = `SavDown community rating: ${rating.toFixed(1)} out of 5 — ${reviewLabel}`;

  return (
    <div
      className={`inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 ${className}`}
      aria-label={ariaLabel}
    >
      {/* Numeric rating */}
      <div className="flex items-baseline gap-1" aria-hidden="true">
        <span
          className="text-2xl font-bold tracking-tight"
          style={{ color: FILLED_COLOR }}
        >
          {rating.toFixed(1)}
        </span>
        <span className="text-sm font-medium text-text-muted">/&nbsp;5</span>
      </div>

      {/* Five-star row */}
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {starFills.map((fill, i) => (
          <Star key={i} fillPercent={fill} />
        ))}
      </span>

      {/* Clickable review count */}
      <Link
        href="/reviews#reviews-list"
        className="text-sm font-medium text-text-muted underline underline-offset-2 decoration-transparent hover:decoration-current hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-sm transition-colors"
      >
        {reviewLabel}
      </Link>
    </div>
  );
}
