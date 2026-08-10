'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

type ReviewFormProps = {
  onSuccess?: () => void;
};

export function ReviewForm({ onSuccess }: ReviewFormProps) {
  const { data: session } = useSession();
  const { success, error: errorToast } = useToast();

  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [platform, setPlatform] = useState('direct');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const canSubmit = rating > 0 && review.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, company, platform, rating, review }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        errorToast('Submission failed', data?.error || 'Please try again.');
        return;
      }

      success('Review submitted!', 'Thank you for sharing your experience.');
      setRole('');
      setCompany('');
      setPlatform('direct');
      setRating(0);
      setReview('');
      onSuccess?.();
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-8 text-center">
        <h3 className="text-lg font-bold text-text mb-2">Share Your SavDown Experience</h3>
        <p className="text-sm text-text-muted mb-4">Sign in to leave a review.</p>
        <Button onClick={() => signIn(undefined, { callbackUrl: window.location.pathname + window.location.search })}>
          Sign In to Review
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-border shadow-soft p-6 md:p-8">
      <h3 className="text-lg font-bold text-text mb-1">Share Your SavDown Experience</h3>
      <p className="text-sm text-text-muted mb-6">Used SavDown? Tell us what you think.</p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
              Role (optional)
            </label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Content Creator"
              className="w-full h-11 rounded-xl border border-border bg-white px-4 text-sm text-text placeholder:text-text-subtle focus:border-primary/40 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
              Company (optional)
            </label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Inc"
              className="w-full h-11 rounded-xl border border-border bg-white px-4 text-sm text-text placeholder:text-text-subtle focus:border-primary/40 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
            Where did you find us?
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full h-11 rounded-xl border border-border bg-white px-4 text-sm text-text focus:border-primary/40 focus:outline-none transition-colors"
          >
            <option value="direct">Direct</option>
            <option value="google">Google</option>
            <option value="trustpilot">Trustpilot</option>
            <option value="producthunt">Product Hunt</option>
            <option value="facebook">Facebook</option>
            <option value="g2">G2</option>
            <option value="x">X (Twitter)</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
            Rating *
          </label>
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoveredStar(i + 1)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(i + 1)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-7 h-7 ${
                    i < (hoveredStar || rating) ? 'fill-amber-400 text-amber-400' : 'fill-none text-text-subtle'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="text-sm text-text-muted ml-2">{rating}/5</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
            Your Review *
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Tell us about your experience with SavDown..."
            rows={4}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-text placeholder:text-text-subtle focus:border-primary/40 focus:outline-none transition-colors resize-none"
          />
          <p className="text-xs text-text-subtle mt-1">{review.length}/500</p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
          className="w-full sm:w-auto"
        >
          Submit Review
        </Button>
      </div>
    </div>
  );
}
