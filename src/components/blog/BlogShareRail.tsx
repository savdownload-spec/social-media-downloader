'use client';

import { useState } from 'react';
import { Check, Copy, Facebook, Linkedin } from 'lucide-react';

type BlogShareRailProps = { title: string };

export function BlogShareRail({ title }: BlogShareRailProps) {
  const [copied, setCopied] = useState(false);

  const currentUrl = () => window.location.href;
  const encodedUrl = () => encodeURIComponent(window.location.href);
  const encodedTitle = encodeURIComponent(title);

  const openShare = (url: string) =>
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=560');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const buttons = [
    {
      label: 'Copy link',
      icon: copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />,
      onClick: copy,
    },
    {
      label: 'Share on Facebook',
      icon: <Facebook className="h-4 w-4" />,
      onClick: () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl()}`),
    },
    {
      label: 'Share on X (Twitter)',
      icon: <span className="text-sm font-bold leading-none">𝕏</span>,
      onClick: () => openShare(`https://twitter.com/intent/tweet?url=${encodedUrl()}&text=${encodedTitle}`),
    },
    {
      label: 'Share on LinkedIn',
      icon: <Linkedin className="h-4 w-4" />,
      onClick: () => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl()}`),
    },
  ];

  return (
    <div className="sticky top-28 hidden flex-col items-center gap-2.5 xl:flex" aria-label="Share article">
      <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-subtle">Share</span>
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.onClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-text-muted shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-card"
          style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
          aria-label={btn.label}
          title={btn.label}
        >
          {btn.icon}
        </button>
      ))}
      <span className="sr-only" role="status">{copied ? 'Link copied' : ''}</span>
    </div>
  );
}
