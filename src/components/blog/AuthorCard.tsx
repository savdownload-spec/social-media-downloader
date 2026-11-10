import Link from 'next/link';
import Image from 'next/image';
import type { BlogPost } from '@/config/blog';

type AuthorCardProps = {
  authorProfile: NonNullable<BlogPost['authorProfile']>;
};

export function AuthorCard({ authorProfile }: AuthorCardProps) {
  const { name, slug, profileImage, role, shortBio } = authorProfile;

  return (
    <div className="mt-10 rounded-2xl border border-border bg-surface/60 p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
      <div className="shrink-0">
        {profileImage ? (
          <Image
            src={profileImage}
            alt={`${name} profile photo`}
            width={72}
            height={72}
            className="rounded-full border-2 border-border object-cover"
          />
        ) : (
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-border text-2xl font-bold text-primary"
            style={{ background: 'rgb(var(--primary) / 0.08)' }}
            aria-hidden="true"
          >
            {name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-1">Written by</p>
        <Link
          href={`/blog/author/${slug}`}
          className="text-base font-semibold text-text hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
        >
          {name}
        </Link>
        <p className="text-xs text-text-muted mt-0.5">{role}</p>
        {shortBio && (
          <p className="text-sm text-text-muted mt-2 leading-relaxed">{shortBio}</p>
        )}
      </div>
      <Link
        href={`/blog/author/${slug}`}
        className="shrink-0 rounded-xl border border-border bg-white dark:bg-card px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 whitespace-nowrap"
        style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
      >
        View profile
      </Link>
    </div>
  );
}
