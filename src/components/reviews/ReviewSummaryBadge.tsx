import { Star } from 'lucide-react';

type Props = {
  averageRating: number | null;
  totalApproved: number;
  className?: string;
};

/**
 * Stateless presentational badge that shows average rating and total approved
 * review count. Returns null when there are no approved reviews yet.
 * Accepts props from both server components (via getReviewSummary()) and
 * client components (via API response data).
 */
export function ReviewSummaryBadge({ averageRating, totalApproved, className = '' }: Props) {
  if (totalApproved === 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm text-text-muted ${className}`}
    >
      {averageRating != null && (
        <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
          <Star className="w-4 h-4 fill-current" />
          {averageRating.toFixed(1)}
        </span>
      )}
      <span className="text-text-muted">
        {totalApproved.toLocaleString()} review{totalApproved !== 1 ? 's' : ''}
      </span>
    </span>
  );
}
