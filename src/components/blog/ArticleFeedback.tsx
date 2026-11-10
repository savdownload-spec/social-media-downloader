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
    <div className="mt-10 rounded-2xl border border-border bg-surface/60 p-5 text-center">
      {submitted ? (
        <p className="text-sm font-medium text-text-muted">
          <span className="text-primary font-semibold">Thanks for your feedback!</span> It helps us improve our guides.
        </p>
      ) : (
        <>
          <p className="text-sm font-medium text-text mb-4">Was this guide helpful?</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={loading}
              className="inline-flex h-11 min-w-[44px] items-center gap-2 rounded-xl border border-border bg-white dark:bg-card px-4 text-sm font-medium text-text-muted transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label="Yes, this guide was helpful"
            >
              <ThumbsUp className="h-4 w-4" aria-hidden="true" /> Yes
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={loading}
              className="inline-flex h-11 min-w-[44px] items-center gap-2 rounded-xl border border-border bg-white dark:bg-card px-4 text-sm font-medium text-text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label="No, this guide was not helpful"
            >
              <ThumbsDown className="h-4 w-4" aria-hidden="true" /> Not really
            </button>
          </div>
        </>
      )}
    </div>
  );
}
