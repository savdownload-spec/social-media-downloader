'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

type ArticleFeedbackProps = { postSlug: string };

export function ArticleFeedback({ postSlug }: ArticleFeedbackProps) {
  const [submitted, setSubmitted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(`feedback-${postSlug}`);
  });
  const [loading, setLoading] = useState(false);

  const submit = async (helpful: boolean) => {
    if (submitted || loading) return;
    setLoading(true);
    try {
      await fetch('/api/blog/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: postSlug, helpful }),
      });
      localStorage.setItem(`feedback-${postSlug}`, helpful ? 'yes' : 'no');
      setSubmitted(true);
    } catch {
      /* fail silently — feedback is non-critical */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 flex flex-col gap-4 border-y border-border py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-text">Was this guide helpful?</p>
        <p className="mt-0.5 text-xs text-text-subtle">Your feedback helps improve our guides.</p>
      </div>
      {submitted ? (
        <p role="status" className="inline-flex items-center gap-2 rounded-xl bg-primary-light px-4 py-2.5 text-sm font-medium text-primary">
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          Thanks for your feedback!
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-text-muted transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-card"
            style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
            aria-label="Yes, this guide was helpful"
          >
            <ThumbsUp className="h-4 w-4" aria-hidden="true" /> Yes, helpful
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-card"
            style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
            aria-label="No, this guide was not helpful"
          >
            <ThumbsDown className="h-4 w-4" aria-hidden="true" /> Not really
          </button>
        </div>
      )}
    </div>
  );
}
