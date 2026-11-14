import { Facebook, Github, Globe, Instagram, Linkedin, Youtube } from 'lucide-react';
import {
  AUTHOR_SOCIAL_META,
  normalizeHttpUrl,
  type AuthorSocialLink,
  type AuthorSocialPlatform,
} from '@/lib/author-profile';
import { cn } from '@/lib/utils';

function PlatformIcon({ platform, className }: { platform: AuthorSocialPlatform; className?: string }) {
  switch (platform) {
    case 'linkedin':
      return <Linkedin className={className} aria-hidden="true" />;
    case 'x':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
        </svg>
      );
    case 'facebook':
      return <Facebook className={className} aria-hidden="true" />;
    case 'instagram':
      return <Instagram className={className} aria-hidden="true" />;
    case 'youtube':
      return <Youtube className={className} aria-hidden="true" />;
    case 'github':
      return <Github className={className} aria-hidden="true" />;
  }
}

const LINK_REL = 'noopener noreferrer nofollow ugc';

/**
 * Renders only verified http(s) destinations. When an author has no valid
 * social or website URLs the whole section disappears instead of exposing
 * empty icons or placeholder links.
 */
export function AuthorSocialLinks({
  name,
  socials,
  website,
  variant = 'icons',
  className,
}: {
  name: string;
  socials: AuthorSocialLink[];
  website?: string | null;
  variant?: 'icons' | 'buttons';
  className?: string;
}) {
  const siteUrl = website ? normalizeHttpUrl(website) : null;
  const links = socials.flatMap((link) => {
    const url = normalizeHttpUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });

  if (!links.length && !siteUrl) return null;

  const linkClass =
    variant === 'buttons'
      ? 'inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-muted shadow-soft transition-colors hover:border-primary/30 hover:text-primary dark:bg-card'
      : 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-muted transition-colors hover:border-primary/30 hover:text-primary dark:bg-card';
  const iconClass = 'h-4 w-4';

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {siteUrl && (
        <a
          href={siteUrl}
          target="_blank"
          rel={LINK_REL}
          aria-label={`${name} website`}
          title="Website"
          className={linkClass}
        >
          <Globe className={iconClass} aria-hidden="true" />
          {variant === 'buttons' && <span>Website</span>}
        </a>
      )}
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel={LINK_REL}
          aria-label={`${name} on ${AUTHOR_SOCIAL_META[link.platform].label}`}
          title={AUTHOR_SOCIAL_META[link.platform].label}
          className={linkClass}
        >
          <PlatformIcon platform={link.platform} className={iconClass} />
          {variant === 'buttons' && <span>{AUTHOR_SOCIAL_META[link.platform].label}</span>}
        </a>
      ))}
    </div>
  );
}
