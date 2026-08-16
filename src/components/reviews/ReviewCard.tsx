'use client';

import Link from 'next/link';
import { Star, ExternalLink } from 'lucide-react';

export type Review = {
  id: string;
  name: string;
  role?: string | null;
  company?: string | null;
  platform: string;
  rating: number;
  review: string;
  createdAt: string;
  featured?: boolean;
  photo?: string | null;
};

const PLATFORM_LABELS: Record<string, { label: string; icon: string }> = {
  direct: { label: 'Direct', icon: '⭐' },
  google: { label: 'Google', icon: '🔍' },
  trustpilot: { label: 'Trustpilot', icon: '🛡️' },
  producthunt: { label: 'Product Hunt', icon: '🚀' },
  facebook: { label: 'Facebook', icon: '📘' },
  g2: { label: 'G2', icon: '📊' },
  x: { label: 'X', icon: '🐦' },
  linkedin: { label: 'LinkedIn', icon: '💼' },
};

const PLATFORM_COLORS: Record<string, string> = {
  direct: 'bg-surface text-text-muted',
  google: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  trustpilot: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  producthunt: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  facebook: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
  g2: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  x: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  linkedin: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
};

export function ReviewCard({ review }: { review: Review }) {
  const platformMeta = PLATFORM_LABELS[review.platform] || PLATFORM_LABELS.direct;
  const platformColor = PLATFORM_COLORS[review.platform] || PLATFORM_COLORS.direct;
  const date = new Date(review.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const initials = review.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/reviews?review=${review.id}`}
      className="group flex flex-col h-full rounded-2xl bg-white dark:bg-card border border-border shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 p-6"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${platformColor}`}>
          <span>{platformMeta.icon}</span>
          <span>{platformMeta.label}</span>
        </span>
        {review.featured && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-warning px-2 py-1 rounded-full">
            ⭐ Featured
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 text-amber-400 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'fill-none text-text-subtle'}`} />
        ))}
      </div>

      <blockquote className="text-sm text-text leading-relaxed flex-1 line-clamp-4">
        &ldquo;{review.review}&rdquo;
      </blockquote>

      <div className="mt-5 flex items-center gap-3 pt-4 border-t border-border-light">
        {review.photo ? (
          <img
            src={review.photo}
            alt={review.name}
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text truncate">{review.name}</div>
          <div className="text-xs text-text-muted truncate">
            {[review.role, review.company].filter(Boolean).join(' at ') || 'SavDown User'}
          </div>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0 ml-auto" />
      </div>

      <div className="mt-3 text-xs text-text-subtle">{date}</div>
    </Link>
  );
}
