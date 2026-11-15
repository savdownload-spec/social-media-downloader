import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import { parseSocials } from '@/lib/author-profile';
import { AuthorSocialLinks } from '@/components/authors/AuthorSocialLinks';

type AuthorCardProps = {
  authorProfile?: BlogPost['authorProfile'];
  authorName: string;
};

function AuthorAvatarImage({ profile, name }: { profile?: BlogPost['authorProfile']; name: string }) {
  if (profile?.profileImage) {
    return (
      <Image
        src={profile.profileImage}
        alt={`${name} profile photo`}
        width={64}
        height={64}
        className="h-16 w-16 rounded-2xl border border-border object-cover"
      />
    );
  }
  return (
    <div
      className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-bold text-white"
      style={{ background: 'linear-gradient(140deg, rgb(var(--primary)), #a855f7)' }}
      aria-hidden="true"
    >
      {name.charAt(0)}
    </div>
  );
}

export function AuthorCard({ authorProfile, authorName }: AuthorCardProps) {
  const name = authorProfile?.name || authorName;
  const isPublished = authorProfile?.published !== false;
  const slug = isPublished ? authorProfile?.slug : undefined;
  const role = authorProfile?.role;
  // Describes the publication's content, never an individual's credentials.
  const bio =
    authorProfile?.shortBio ||
    'We create practical SavDown guides to help people understand digital media formats, video quality, and everyday creator tools, with clear, easy-to-follow steps.';

  return (
    <section
      aria-label={`About the author, ${name}`}
      className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="shrink-0">
          {slug ? (
            <Link href={`/authors/${slug}`} aria-label={`View ${name}'s profile`} className="block">
              <AuthorAvatarImage profile={authorProfile} name={name} />
            </Link>
          ) : (
            <AuthorAvatarImage profile={authorProfile} name={name} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Written by</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              {slug ? (
                <Link
                  href={`/authors/${slug}`}
                  className="text-base font-semibold text-text transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
                >
                  {name}
                </Link>
              ) : (
                <h3 className="text-base font-semibold text-text">{name}</h3>
              )}
              {role && <p className="text-xs text-text-muted">{role}</p>}
            </div>
            {slug && (
              <Link
                href={`/authors/${slug}`}
                className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex dark:bg-card"
                style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
              >
                View profile <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>

          <p className="mt-3 text-sm leading-7 text-text-muted">{bio}</p>

          {slug && (
            <div className="mt-3">
              <AuthorSocialLinks
                name={name}
                socials={parseSocials(authorProfile?.socialsJson)}
                variant="buttons"
              />
            </div>
          )}

          {slug && (
            <Link
              href={`/authors/${slug}`}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover sm:hidden"
            >
              View profile <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
