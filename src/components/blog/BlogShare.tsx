'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Facebook, Linkedin, Mail, MoreHorizontal } from 'lucide-react';

type BlogShareProps = { title: string; description: string };

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function RedditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

export function BlogShare({ title, description }: BlogShareProps) {
  const [copied, setCopied] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentUrl = () => window.location.href;

  const openShare = (url: string) =>
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=560');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: description, url: currentUrl() });
    } catch {
      // User cancelled or not supported — fall back to copy
      await copy();
    }
  };

  // Close popover on click outside
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverOpen]);

  // Escape key closes popover
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [popoverOpen]);

  const encodedUrl = encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '');
  const encodedTitle = encodeURIComponent(title);

  const primaryButtons = [
    {
      label: 'Copy Link',
      icon: copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />,
      onClick: copy,
      text: copied ? 'Copied!' : 'Copy Link',
    },
    {
      label: 'Share on Facebook',
      icon: <Facebook className="h-4 w-4" />,
      onClick: () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`),
    },
    {
      label: 'Share on X (Twitter)',
      icon: <span className="text-sm font-bold leading-none">𝕏</span>,
      onClick: () => openShare(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`),
    },
    {
      label: 'Share on LinkedIn',
      icon: <Linkedin className="h-4 w-4" />,
      onClick: () => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`),
    },
    {
      label: 'Share via Email',
      icon: <Mail className="h-4 w-4" />,
      onClick: () => { window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`; },
    },
  ];

  const moreItems = [
    {
      label: 'WhatsApp',
      icon: <WhatsAppIcon />,
      onClick: () => openShare(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`),
    },
    {
      label: 'Telegram',
      icon: <TelegramIcon />,
      onClick: () => openShare(`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`),
    },
    {
      label: 'Reddit',
      icon: <RedditIcon />,
      onClick: () => openShare(`https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`),
    },
    {
      label: 'Pinterest',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      ),
      onClick: () => openShare(`https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`),
    },
    {
      label: 'Web Share / Copy',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 1 1 0-2.684m0 2.684 6.632 3.316m-6.632-6 6.632-3.316m0 0a3 3 0 1 0 5.367-2.684 3 3 0 0 0-5.367 2.684zm0 9.316a3 3 0 1 0 5.368 2.684 3 3 0 0 0-5.368-2.684z" />
        </svg>
      ),
      onClick: nativeShare,
    },
    {
      label: 'Copy Title + URL',
      icon: <Copy className="h-4 w-4" />,
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(`${title}\n\n${currentUrl()}`);
        } catch { /* ignore */ }
        setPopoverOpen(false);
      },
    },
    {
      label: 'Print',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      ),
      onClick: () => { window.print(); setPopoverOpen(false); },
    },
  ];

  return (
    <div className="relative flex flex-wrap items-center gap-2" aria-label="Share this article">
      <span className="mr-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Share</span>

      {/* Copy Link (with text label) */}
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-9 min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full border border-border bg-white dark:bg-card px-3 text-xs font-semibold text-text-muted transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
        aria-label="Copy article link"
        aria-live="polite"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? 'Copied!' : 'Copy'}
      </button>

      {/* Primary icon buttons */}
      {primaryButtons.slice(1).map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.onClick}
          className="inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-white dark:bg-card text-text-muted transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
          aria-label={btn.label}
          title={btn.label}
        >
          {btn.icon}
        </button>
      ))}

      {/* More button + popover */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setPopoverOpen((p) => !p)}
          className="inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-white dark:bg-card text-text-muted transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
          aria-label="More sharing options"
          aria-expanded={popoverOpen}
          aria-haspopup="dialog"
          title="More"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>

        {popoverOpen && (
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            aria-label="More sharing options"
            className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl border border-border bg-white dark:bg-card shadow-soft-lg p-2"
          >
            {moreItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-muted transition-colors hover:bg-primary-light hover:text-primary min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
              >
                <span className="shrink-0" aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="sr-only" role="status">{copied ? 'Link copied to clipboard' : ''}</span>
    </div>
  );
}
