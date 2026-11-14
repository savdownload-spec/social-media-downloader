import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowLeft, CalendarDays, FileText, Info } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AuthorAvatar } from '@/components/authors/AuthorAvatar';
import { AuthorSocialLinks } from '@/components/authors/AuthorSocialLinks';
import { AuthorArticles } from '@/components/authors/AuthorArticles';
import { getAuthorPosts, lookupPublicAuthor } from '@/lib/authors';
import { buildMetadata, jsonLd } from '@/lib/seo';
import { siteConfig } from '@/config/site';
import { formatDate } from '@/lib/utils';

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await lookupPublicAuthor(params.slug);
  if (result.status !== 'ok') {
    return { title: 'Author not found', robots: { index: false, follow: false } };
  }
  const author = result.author;
  return buildMetadata({
    title: `${author.name} — ${author.role}`,
    description:
      author.shortBio ||
      `${author.name} is a ${author.role} at SavDown. Read their latest guides, tutorials, and insights.`,
    path: `/authors/${author.slug}`,
    keywords: [author.name, author.role, ...author.expertise, 'SavDown author'],
    author: author.name,
    image: author.profileImage ?? undefined,
    noIndex: author.isSample,
    noFollow: author.isSample,
  });
}

export const dynamic = 'force-dynamic';

export default async function AuthorProfilePage({ params }: PageProps) {
  const result = await lookupPublicAuthor(params.slug);
  if (result.status === 'redirect') permanentRedirect(`/authors/${result.to}`);
  if (result.status !== 'ok') notFound();

  const author = result.author;
  const posts = await getAuthorPosts(author);
  const firstName = author.name.trim().split(/\s+/)[0];
  const about = (author.extendedBio || author.shortBio || '').trim();
  const aboutParagraphs = about ? about.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean) : [];
  const articleLabel = `${posts.length} ${posts.length === 1 ? 'published article' : 'published articles'}`;
  const profileUrl = `${siteConfig.url}/authors/${author.slug}`;
  const sameAs = [author.website, ...author.socials.map((link) => link.url)].filter((url): url is string => Boolean(url));

  const personSchema = {
    '@type': 'ProfilePage',
    url: profileUrl,
    name: author.name,
    mainEntity: {
      '@type': 'Person',
      name: author.name,
      url: profileUrl,
      jobTitle: author.role,
      description: author.shortBio || about,
      image: author.profileImage
        ? author.profileImage.startsWith('http')
          ? author.profileImage
          : `${siteConfig.url}${author.profileImage}`
        : undefined,
      knowsAbout: author.expertise.length ? author.expertise : undefined,
      sameAs: sameAs.length ? sameAs : undefined,
      worksFor: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
    },
  };

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border bg-gradient-mesh dark:bg-gradient-mesh-dark">
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden="true" />
        <Container className="relative max-w-6xl py-12 md:py-16">
          <Breadcrumb
            className="mb-8"
            includeSchema
            items={[
              { label: 'Home', href: '/' },
              { label: 'Authors', href: '/authors' },
              { label: author.name },
            ]}
          />

          <div className="flex flex-col items-center text-center">
            <Link
              href="/authors"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All authors
            </Link>

            <div className="mt-7 flex flex-col items-center gap-7">
              <AuthorAvatar author={author} size="xl" shape="rounded-3xl" priority className="shadow-soft-lg" />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Author profile</p>
                  {author.isSample && (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
                      Sample profile
                    </span>
                  )}
                </div>
                <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.06] tracking-tight text-text sm:text-5xl">
                  {author.name}
                </h1>
                <p className="mt-2 text-base font-medium text-primary sm:text-lg">{author.role}</p>
                {author.shortBio && (
                  <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">{author.shortBio}</p>
                )}
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {articleLabel}
                </p>
                <AuthorSocialLinks
                  name={author.name}
                  socials={author.socials}
                  website={author.website}
                  variant="buttons"
                  className="mt-5 justify-center"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="max-w-6xl py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
          <div className="min-w-0">
            {aboutParagraphs.length > 0 && (
              <section aria-labelledby="author-about">
                <h2
                  id="author-about"
                  className="font-display text-2xl font-semibold tracking-tight text-text md:text-3xl"
                >
                  About {firstName}
                </h2>
                <div className="mt-5 space-y-4 text-[15px] leading-7 text-text-muted">
                  {aboutParagraphs.map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            <section
              id="articles"
              aria-labelledby="author-articles"
              className={aboutParagraphs.length ? 'mt-12 border-t border-border-light pt-10' : ''}
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="author-articles"
                    className="font-display text-2xl font-semibold tracking-tight text-text md:text-3xl"
                  >
                    Articles by {firstName}
                  </h2>
                  <p className="mt-2 text-sm text-text-muted">
                    {articleLabel} on SavDown.
                  </p>
                </div>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
                >
                  All articles
                </Link>
              </div>
              <div className="mt-6">
                <AuthorArticles posts={posts} />
              </div>
            </section>
          </div>

          <aside className="space-y-5 self-start lg:sticky lg:top-24">
            {author.expertise.length > 0 && (
              <section className="rounded-3xl border border-border bg-white p-6 shadow-soft dark:bg-card">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Expertise</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {author.expertise.map((item) => (
                    <li
                      key={item}
                      className="inline-flex items-center rounded-full border border-border-light bg-surface px-3 py-1.5 text-xs font-medium text-text-muted"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-3xl border border-border bg-white p-6 shadow-soft dark:bg-card">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">At a glance</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-muted">Published articles</dt>
                  <dd className="font-semibold text-text">{posts.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-muted">Profile updated</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-text">
                    <CalendarDays className="h-3.5 w-3.5 text-text-subtle" aria-hidden="true" />
                    {formatDate(author.updatedAt)}
                  </dd>
                </div>
              </dl>
            </section>

            {author.isSample && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                <p className="flex items-center gap-2 font-semibold">
                  <Info className="h-4 w-4" aria-hidden="true" />
                  Sample profile
                </p>
                <p className="mt-1">
                  This fictional demo author exists for testing. It is excluded from search engines and the sitemap.
                </p>
              </div>
            )}
          </aside>
        </div>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(personSchema)} />
    </main>
  );
}
