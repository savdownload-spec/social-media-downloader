type Props = {
  averageRating: number | null;
  totalApproved: number;
  className?: string;
};

const FILLED_BG = '#00b67a';
const EMPTY_BG = '#dcdce6';

const STAR_SVG = (
  <svg
    viewBox="0 0 40 40"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '100%', padding: '6px' }}
  >
    <path d="M20 3l4.9 9.9 10.9 1.6-7.9 7.7 1.9 10.8L20 27.9l-9.8 5.1 1.9-10.8L4.2 14.5l10.9-1.6L20 3z" />
  </svg>
);

function StarTile({ fillPercent }: { fillPercent: number }) {
  const isPartial = fillPercent > 0 && fillPercent < 100;

  if (!isPartial) {
    // Fully filled or fully empty — single div
    return (
      <div
        style={{
          width: 36,
          height: 36,
          backgroundColor: fillPercent >= 100 ? FILLED_BG : EMPTY_BG,
          flexShrink: 0,
        }}
      >
        {STAR_SVG}
      </div>
    );
  }

  // Partial fill: grey base + green overlay clipped to fillPercent%
  return (
    <div style={{ width: 36, height: 36, position: 'relative', flexShrink: 0 }}>
      {/* Grey base — always full width */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: EMPTY_BG,
        }}
      >
        {STAR_SVG}
      </div>
      {/* Green overlay — clipped to fillPercent% width */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: `${fillPercent}%`,
          overflow: 'hidden',
          backgroundColor: FILLED_BG,
        }}
      >
        {STAR_SVG}
      </div>
    </div>
  );
}

function getRatingLabel(rating: number | null, totalApproved: number): string {
  if (totalApproved === 0 || rating === null) return 'No reviews yet';
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Great';
  if (rating >= 3.5) return 'Good';
  if (rating >= 3.0) return 'Average';
  return 'Poor';
}

/**
 * Polished rating badge that shows average star rating and total approved
 * review count using a Trustpilot-inspired layout with SavDown branding.
 */
export function ReviewSummaryBadge({
  averageRating,
  totalApproved,
  className = '',
}: Props) {
  const label = getRatingLabel(averageRating, totalApproved);
  const rating = averageRating ?? 0;

  const tiles = [0, 1, 2, 3, 4].map((i) => {
    const raw = (rating - i) * 100;
    const fillPercent = Math.min(100, Math.max(0, raw));
    return fillPercent;
  });

  const hasReviews = totalApproved > 0 && averageRating !== null;

  return (
    <div
      className={`inline-flex flex-col items-center gap-1.5 ${className}`}
    >
      {/* 1. Rating label */}
      <p
        className="text-sm font-bold"
        style={{ color: hasReviews ? '#191919' : '#6b7280' }}
      >
        {label}
      </p>

      {/* 2. Five square star tiles */}
      <div className="flex" style={{ gap: 2 }}>
        {tiles.map((fillPercent, i) => (
          <StarTile key={i} fillPercent={fillPercent} />
        ))}
      </div>

      {/* 3. Based on N reviews — only shown when there are reviews */}
      {hasReviews && (
        <p className="text-xs text-text-muted">
          Based on {totalApproved.toLocaleString()} review{totalApproved !== 1 ? 's' : ''}
        </p>
      )}

      {/* 4. SavDown branding */}
      <p className="text-[11px] font-semibold text-text-muted flex items-center gap-0.5">
        <span style={{ color: FILLED_BG }}>★</span> SavDown
      </p>
    </div>
  );
}
