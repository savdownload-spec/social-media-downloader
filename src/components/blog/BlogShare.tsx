'use client';

import { useState } from 'react';
import { Check, Copy, Facebook, Linkedin, Mail, MoreHorizontal, Share2 } from 'lucide-react';

type BlogShareProps = { title: string; description: string };

export function BlogShare({ title, description }: BlogShareProps) {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');

  const currentUrl = () => window.location.href;
  const shareTitle = encodeURIComponent(title);
  const shareText = encodeURIComponent(description);
  const openShare = (url: string) => window.open(url, '_blank', 'noopener,noreferrer,width=720,height=560');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setNotice('Link copied');
      window.setTimeout(() => { setCopied(false); setNotice(''); }, 2200);
    } catch {
      setNotice('Copy is unavailable in this browser');
    }
  };
  const nativeShare = async () => {
    if (!navigator.share) return;
    try { await navigator.share({ title, text: description, url: currentUrl() }); } catch { /* User cancelled sharing. */ }
  };

  const buttons = [
    { label: 'Facebook', icon: <Facebook className="h-4 w-4" />, onClick: () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl())}`) },
    { label: 'X', icon: <span className="text-sm font-bold leading-none">X</span>, onClick: () => openShare(`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl())}&text=${shareTitle}`) },
    { label: 'WhatsApp', icon: <MoreHorizontal className="h-4 w-4" />, onClick: () => openShare(`https://wa.me/?text=${shareTitle}%20${encodeURIComponent(currentUrl())}`) },
    { label: 'LinkedIn', icon: <Linkedin className="h-4 w-4" />, onClick: () => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl())}`) },
    { label: 'Email', icon: <Mail className="h-4 w-4" />, onClick: () => { window.location.href = `mailto:?subject=${shareTitle}&body=${shareText}%0A%0A${encodeURIComponent(currentUrl())}`; } },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Share this article">
      <span className="mr-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Share</span>
      <button type="button" onClick={copy} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-xs font-semibold text-text-muted transition-colors hover:border-primary/30 hover:text-primary" aria-label="Copy article link">
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy link'}
      </button>
      {buttons.map((button) => (
        <button key={button.label} type="button" onClick={button.onClick} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-muted transition-colors hover:border-primary/30 hover:text-primary" aria-label={`Share on ${button.label}`} title={button.label}>{button.icon}</button>
      ))}
      <button type="button" onClick={nativeShare} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-hover md:hidden" aria-label="Use device share menu">
        <Share2 className="h-4 w-4" /> Share
      </button>
      <span className="sr-only" role="status">{notice}</span>
    </div>
  );
}