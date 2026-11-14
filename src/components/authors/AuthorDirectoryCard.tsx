import Link from 'next/link';
import { ArrowUpRight, FileText } from 'lucide-react';
import type { PublicAuthor } from '@/lib/author-profile';
import { AuthorAvatar } from '@/components/authors/AuthorAvatar';
import { AuthorSocialLinks } from '@/components/authors/AuthorSocialLinks';

export function AuthorDirectoryCard({
  author,
  priority = false,
}: {
  author: PublicAuthor;
  priority?: boolean;
}) {
  const articleLabel = `${author.articleCount} ${author.articleCount === 1 ? 'article' : 'articles'}`;
  const visibleExpertise = author.expertise.slice(0, 3);
  const extraExpertise = author.expertise.length - visibleExpertise.length;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-soft-lg focus-within:border-primary/30 focus-within:shadow-soft-lg dark:bg-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-brand-soft opacity-60 transition-opacity duration-300 group-hover:opacity-100 dark:bg-none dark:bg-primary/10"
      />

      <div className="relative flex items-start gap-4">
        <AuthorAvatar author={author} size="lg" priority={priority} />
        <div className="min-w-0 pt-1">
          <h2 className="font-display text-xl font-semibold leading-snug tracking-tight text-text">
            <Link
              href={`/authors/${author.slug}`}
              className="rounded-sm outline-none after:absolute after:inset-0 after:z-0 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              {author.name}
            </Link>
          </h2>
          <p className="mt-1 text-sm font-medium text-primary">{author.role}</p>
          {author.isSample && (
            <span
              className="mt-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
              title="Demo profile for testing — not a real person"
            >
              Sample
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-5 flex flex-1 flex-col">
        <p className="line-clamp-3 text-sm leading-6 text-text-muted">
          {author.shortBio || `${author.role} at SavDown.`}
        </p>

        {visibleExpertise.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`${author.name} expertise`}>
            {visibleExpertise.map((item) => (
              <li
                key={item}
                className="inline-flex items-center rounded-full border border-border-light bg-surface px-2.5 py-1 text-[11px] font-medium text-text-muted"
              >
                {item}
              </li>
            ))}
            {extraExpertise > 0 && (
              <li className="inline-flex items-center rounded-full border border-border-light bg-surface px-2.5 py-1 text-[11px] font-medium text-text-muted">
                +{extraExpertise}
              </li>
            )}
          </ul>
        )}

        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between gap-3 border-t border-border-light pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {articleLabel}
            </span>
            <div className="relative z-10">
              <AuthorSocialLinks
                name={author.name}
                socials={author.socials}
                website={author.website}
              />
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            View Profile
            <ArrowUpRight
              className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </article>
  );
}
