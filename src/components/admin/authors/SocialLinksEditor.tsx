'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  AUTHOR_SOCIAL_META,
  AUTHOR_SOCIAL_PLATFORMS,
  MAX_SOCIAL_LINKS,
  normalizeHttpUrl,
  type AuthorSocialLink,
  type AuthorSocialPlatform,
} from '@/lib/author-profile';

export function SocialLinksEditor({
  value,
  onChange,
}: {
  value: AuthorSocialLink[];
  onChange: (links: AuthorSocialLink[]) => void;
}) {
  const available = AUTHOR_SOCIAL_PLATFORMS.filter(
    (platform) => !value.some((link) => link.platform === platform),
  );
  const [platform, setPlatform] = useState<AuthorSocialPlatform | ''>(available[0] ?? '');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const selected = platform && available.includes(platform) ? platform : available[0] ?? '';

  const add = () => {
    setError('');
    if (!selected) {
      setError('Choose a platform first.');
      return;
    }
    const normalized = normalizeHttpUrl(url);
    if (!normalized) {
      setError('Enter a valid http(s) URL, for example https://linkedin.com/in/username.');
      return;
    }
    if (value.some((link) => link.platform === selected)) {
      setError(`${AUTHOR_SOCIAL_META[selected].label} is already added.`);
      return;
    }
    const next = [...value, { platform: selected, url: normalized }];
    onChange(next);
    setUrl('');
    const nextPlatform = AUTHOR_SOCIAL_PLATFORMS.find(
      (candidate) => !next.some((link) => link.platform === candidate),
    );
    setPlatform(nextPlatform ?? '');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Social media links</p>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-text-subtle transition-colors hover:text-rose-600"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            Remove all
          </button>
        )}
      </div>

      {value.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {value.map((link) => (
            <li
              key={link.platform}
              className="flex items-center justify-between gap-3 rounded-xl border border-border-light bg-surface/60 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-[12px] font-semibold text-text">
                  {AUTHOR_SOCIAL_META[link.platform].label}
                </span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="truncate text-[11px] text-text-subtle underline-offset-2 hover:text-primary hover:underline"
                >
                  {link.url}
                </a>
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item.platform !== link.platform))}
                aria-label={`Remove ${AUTHOR_SOCIAL_META[link.platform].label} link`}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-border bg-surface/40 px-3 py-3 text-[11px] leading-5 text-text-subtle">
          No social links yet. The public social section stays completely hidden until a valid link is added.
        </p>
      )}

      {value.length >= MAX_SOCIAL_LINKS ? (
        <p className="mt-3 text-[11px] text-text-subtle">All {MAX_SOCIAL_LINKS} supported platforms are added.</p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)_auto]">
          <label className="sr-only" htmlFor="social-platform">
            Social platform
          </label>
          <select
            id="social-platform"
            value={selected}
            onChange={(event) => setPlatform(event.target.value as AuthorSocialPlatform | '')}
            className="h-9 rounded-lg border border-border-light bg-white px-3 text-[12px] text-text focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {available.length === 0 && <option value="">No platforms left</option>}
            {available.map((item) => (
              <option key={item} value={item}>
                {AUTHOR_SOCIAL_META[item].label}
              </option>
            ))}
          </select>

          <div>
            <label className="sr-only" htmlFor="social-url">
              Social profile URL
            </label>
            <input
              id="social-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  add();
                }
              }}
              placeholder={selected ? AUTHOR_SOCIAL_META[selected].placeholder : 'https://…'}
              className="h-9 w-full rounded-lg border border-border-light bg-white px-3 text-[12px] text-text placeholder:text-text-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="button"
            onClick={add}
            disabled={!selected}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary/[0.08] px-3 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add link
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}
