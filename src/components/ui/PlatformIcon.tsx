import type { Platform } from '@/config/tools';

/**
 * Simplified, recognizable brand glyphs rendered in white, meant to sit
 * inside a brand-colored tile (see platformBrand). Nominative use only —
 * these identify the source platform a tool works with.
 */
export function PlatformIcon({
  platform,
  className = 'w-5 h-5',
}: {
  platform: Platform;
  className?: string;
}) {
  const glyph = glyphs[platform];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {glyph}
    </svg>
  );
}

const glyphs: Record<Platform, React.ReactNode> = {
  youtube: (
    <path
      fill="currentColor"
      d="M8.5 6.8v10.4l9-5.2-9-5.2z"
    />
  ),
  tiktok: (
    <path
      fill="currentColor"
      d="M14.2 3c.35 2.2 1.6 3.65 3.8 3.9v2.55c-1.3.1-2.55-.3-3.75-1.05v5.7a5.05 5.05 0 1 1-5.05-5.05c.3 0 .6.03.9.08v2.6a2.55 2.55 0 1 0 1.75 2.42V3h2.35z"
    />
  ),
  instagram: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" stroke="none" />
    </g>
  ),
  facebook: (
    <path
      fill="currentColor"
      d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.95c0-.9.28-1.5 1.55-1.5h1.65V3.7c-.3-.04-1.3-.13-2.45-.13-2.45 0-4.1 1.48-4.1 4.2v2.13H7.4V13h2.7v8h3.4z"
    />
  ),
  pinterest: (
    <path
      fill="currentColor"
      d="M12.25 3C7.7 3 5 6.05 5 9.28c0 1.5.82 3.35 2.2 3.95.22.1.34.05.4-.18l.16-.68c.06-.2.03-.28-.11-.46-.4-.5-.66-1.3-.66-2.08 0-2.6 1.98-5.12 5.16-5.12 2.8 0 4.36 1.72 4.36 4 0 3.02-1.32 5.55-3.3 5.55-1.09 0-1.9-.9-1.64-2.02.31-1.32.9-2.75.9-3.7 0-.85-.46-1.56-1.4-1.56-1.1 0-2 1.15-2 2.68 0 .98.34 1.64.34 1.64l-1.32 5.6c-.4 1.66-.06 3.68-.03 3.9.02.1.13.13.19.05.08-.1 1.13-1.4 1.48-2.68l.6-2.28c.36.68 1.4 1.25 2.5 1.25 3.3 0 5.53-3 5.53-7.02C19.72 5.75 17.2 3 12.25 3z"
    />
  ),
  x: (
    <path
      fill="currentColor"
      d="M17.4 3h2.9l-6.35 7.25L21.5 21h-5.85l-4.05-5.3L6.9 21H4l6.8-7.75L3.3 3h6l3.65 4.83L17.4 3zm-1.02 16.25h1.6L7.7 4.65H6l10.38 14.6z"
    />
  ),
};
