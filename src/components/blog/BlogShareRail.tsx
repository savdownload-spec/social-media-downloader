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
    <div className="hidden xl:flex flex-col items-center gap-3 pt-2" aria-label="Share article">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.onClick}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white dark:bg-card text-text-muted shadow-soft transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
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
