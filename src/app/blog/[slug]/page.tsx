import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, RefreshCw } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogComments } from '@/components/blog/BlogComments';
import { BlogCover } from '@/components/blog/BlogCover';
import { BlogFaq } from '@/components/blog/BlogFaq';
import { BlogPostBody, getHeadingsForPost } from '@/components/blog/BlogPostBody';
import { BlogShare } from '@/components/blog/BlogShare';
import { BlogShareRail } from '@/components/blog/BlogShareRail';
import { BlogSidebar } from '@/components/blog/BlogSidebar';
import { AuthorCard } from '@/components/blog/AuthorCard';
import { ArticleFeedback } from '@/components/blog/ArticleFeedback';
import { ArticleNavigation } from '@/components/blog/ArticleNavigation';
import { ReadingProgressBar } from '@/components/blog/ReadingProgressBar';
import { BackToTop } from '@/components/blog/BackToTop';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { buildMetadata, breadcrumbSchema, canonicalUrl as resolveCanonicalUrl, jsonLd } from '@/lib/seo';
import { buildFaqSchema, buildHowToSchema } from '@/lib/content-studio/schema';
import { getPublicBlogPosts } from '@/lib/blog';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';
type Props = { params: { slug: string } };
type Post = NonNullable<Awaited<ReturnType<typeof getPublicBlogPosts>>[number]>;

function relatedTo(post: Post, candidates: Post[]) {
  const scored = candidates
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => post.tags.includes(tag)).length;
      return {
        candidate,
        score: sharedTags * 3 + (candidate.category === post.category ? 4 : 0) + (candidate.toolSlug === post.toolSlug ? 2 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || +new Date(b.candidate.publishedAt) - +new Date(a.candidate.publishedAt));

  // Phase M: only show posts with score > 0 unless there are very few candidates
  const filtered = scored.filter((r) => r.score > 0 || candidates.length <= 3);
  return filtered.slice(0, 3).map(({ candidate }) => candidate);
}

// Date-only values (YYYY-MM-DD) must not shift a day when the server or reader
// is west of UTC, so pin the parse to noon UTC and format in UTC.
function formatArticleDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export async function generateMetadata({ params }: Props) {
  const allPosts = await getPublicBlogPosts();
  const post = allPosts.find((p) => p.slug === params.slug);
  if (!post) return {};

  const image = post.ogImage || (post.coverImage ? `${siteConfig.url}${post.coverImage}` : undefined);
  const publishedIso = post.publishedAt.slice(0, 10);
  const updatedIso = post.updatedAt?.slice(0, 10);
  const lastUpdatedIso = updatedIso && updatedIso > publishedIso ? updatedIso : undefined;

  return buildMetadata({
    title: post.seoTitle || post.title,
    description: post.metaDescription || post.excerpt,
    path: post.canonicalUrl || `/blog/${post.slug}`,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords, ...post.tags],
    noIndex: post.noIndex,
    noFollow: post.noFollow,
    type: 'article',
    image,
    publishedTime: post.publishedAt,
    modifiedTime: lastUpdatedIso,
    author: post.authorProfile?.name || post.author,
  });
}

export default async function BlogPostPage({ params }: Props) {
  // Phase M: single DB round-trip
  const allPosts = await getPublicBlogPosts();
  const post = allPosts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const related = relatedTo(post, allPosts);
  const headings = getHeadingsForPost(post);
  const canonicalPath = post.canonicalUrl || `/blog/${post.slug}`;
  const canonicalUrl = resolveCanonicalUrl(canonicalPath);
  const image = post.ogImage || `${siteConfig.url}${post.coverImage}`;
  const categoryPath = `/blog?category=${encodeURIComponent(post.category)}`;

  // Only a later calendar day counts as a meaningful revision. Falls back to
  // hiding "Last updated" entirely when no newer content date is available.
  const publishedIso = post.publishedAt.slice(0, 10);
  const updatedIso = post.updatedAt?.slice(0, 10);
  const lastUpdatedIso = updatedIso && updatedIso > publishedIso ? updatedIso : null;

  // Prev / Next navigation (Phase I)
  const sortedPosts = [...allPosts].sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt));
  const currentIdx = sortedPosts.findIndex((p) => p.slug === post.slug);
  const prevPost = currentIdx > 0 ? sortedPosts[currentIdx - 1] : null;
  const nextPost = currentIdx < sortedPosts.length - 1 ? sortedPosts[currentIdx + 1] : null;

  const articleSchema = {
    '@type': post.schemaType || 'BlogPosting',
    headline: post.title,
    description: post.metaDescription,
    author: {
      '@type': 'Person',
      name: post.authorProfile?.name || post.author,
      ...(post.authorProfile && post.authorProfile.published !== false
        ? { url: `${siteConfig.url}/authors/${post.authorProfile.slug}` }
        : {}),
    },
    datePublished: post.publishedAt,
    ...(lastUpdatedIso ? { dateModified: lastUpdatedIso } : {}),
    image,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords, ...post.tags].join(', '),
    publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  };

  const breadcrumbLabel = post.breadcrumbTitle || post.title;
  const crumbs = [
    { name: 'Home', url: siteConfig.url },
    { name: 'Blog', url: `${siteConfig.url}/blog` },
    { name: post.category, url: `${siteConfig.url}${categoryPath}` },
    { name: breadcrumbLabel, url: canonicalUrl },
  ];
  const faqSchemaData = post.faqItems?.length ? buildFaqSchema(post.faqItems) : null;
  const howToSchemaData = post.howToSteps?.length ? buildHowToSchema(post.title, post.howToSteps) : null;

  // Legacy articles render their FAQ inside the body already. Only surface the
  // structured FAQ data when the body has no matching section, otherwise the
  // same questions would appear twice.
  const faqInBody = headings.some((heading) => /faq|frequently asked/i.test(heading.title));
  const showFaq = !faqInBody && (post.faqItems?.length ?? 0) > 0;

  return (
    <main>
      {/* JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(articleSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema(crumbs))} />
      {faqSchemaData && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchemaData)} />}
      {howToSchemaData && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(howToSchemaData)} />}

      {/* Reading progress (client-only) */}
      <ReadingProgressBar />

      <div className="bg-background">
        {/* Article hero */}
        <Container className="max-w-6xl pt-8 md:pt-12">
          <Breadcrumb
            className="mb-7 md:mb-9"
            items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: post.category, href: categoryPath },
              { label: breadcrumbLabel },
            ]}
          />

          <header className="mx-auto max-w-4xl pb-9 text-center md:pb-11">
            <Link
              href={categoryPath}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light/60 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:border-primary/40 hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {post.category}
            </Link>

            <h1 className="mt-5 font-display text-[2.3rem] font-bold leading-[1.08] tracking-[-0.03em] text-text sm:text-5xl md:text-[3.4rem]">
              {post.title}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-muted md:text-lg md:leading-8">
              {post.excerpt}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-text-muted sm:text-sm">
              {post.authorProfile && post.authorProfile.published !== false ? (
                <Link
                  href={`/authors/${post.authorProfile.slug}`}
                  className="inline-flex items-center gap-2 rounded-full font-semibold text-text transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
                >
                  {post.authorProfile.profileImage ? (
                    <Image
                      src={post.authorProfile.profileImage}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <span
                      className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white"
                      style={{ background: 'rgb(var(--primary))' }}
                      aria-hidden="true"
                    >
                      {post.authorProfile.name.charAt(0)}
                    </span>
                  )}
                  <span>By {post.authorProfile.name}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 font-semibold text-text">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: 'rgb(var(--primary))' }}
                    aria-hidden="true"
                  >
                    {post.author.charAt(0)}
                  </span>
                  <span>By {post.author}</span>
                </span>
              )}

              <span className="h-1 w-1 rounded-full bg-text-subtle/50" aria-hidden="true" />

              <time dateTime={publishedIso} className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Published {formatArticleDate(publishedIso)}
              </time>

              {lastUpdatedIso && (
                <>
                  <span className="h-1 w-1 rounded-full bg-text-subtle/50" aria-hidden="true" />
                  <time dateTime={lastUpdatedIso} className="inline-flex items-center gap-1.5">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Updated {formatArticleDate(lastUpdatedIso)}
                  </time>
                </>
              )}

              <span className="h-1 w-1 rounded-full bg-text-subtle/50" aria-hidden="true" />

              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {post.readingTime}
              </span>
            </div>

            {/* Share (mobile / tablet — XL shows the rail) */}
            <div className="mt-7 flex justify-center xl:hidden">
              <BlogShare title={post.seoTitle || post.title} description={post.metaDescription || post.excerpt} />
            </div>
          </header>

          <figure className="mx-auto max-w-6xl">
            <BlogCover post={post} priority className="aspect-[16/8] rounded-3xl border border-border shadow-soft-lg" />
            {post.coverAlt && (
              <figcaption className="mx-auto mt-3 max-w-3xl text-center text-xs leading-5 text-text-subtle">
                {post.coverAlt}
              </figcaption>
            )}
          </figure>
        </Container>

        {/* 3-column grid: [share rail | article | sticky sidebar] */}
        <Container className="max-w-6xl py-12 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[56px_minmax(0,1fr)_300px] xl:gap-12">

            {/* Left column: share rail (XL only) */}
            <div className="hidden xl:block">
              <BlogShareRail title={post.seoTitle || post.title} />
            </div>

            {/* Center column: article */}
            <article className="mx-auto w-full min-w-0 max-w-[720px]">
              <BlogPostBody post={post} />

              {showFaq && <BlogFaq items={post.faqItems ?? []} />}

              {/* CTA block */}
              <div className="relative mt-12 overflow-hidden rounded-3xl bg-gradient-brand px-6 py-10 text-center text-white shadow-glow-lg md:px-10 md:py-12">
                <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full border border-white/20" aria-hidden="true" />
                <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full border border-white/15" aria-hidden="true" />
                <div className="relative">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">Save it when you need it</p>
                  <h2 className="mt-3 font-display text-2xl font-bold tracking-tight md:text-3xl">Ready to use SavDown?</h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/80">
                    Paste a public link, choose an available format, and keep your media workflow simple.
                  </p>
                  <Link
                    href={post.toolSlug ? `/tools/${post.toolSlug}` : '/tools'}
                    className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Try SavDown Free <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Article feedback */}
              <ArticleFeedback postSlug={post.slug} />

              {/* Author card */}
              <AuthorCard authorProfile={post.authorProfile} authorName={post.author} />

              {/* Prev / Next navigation */}
              <ArticleNavigation prevPost={prevPost} nextPost={nextPost} />

              {/* Comments */}
              <BlogComments postSlug={post.slug} />
            </article>

            {/* Right column: sticky sidebar (TOC + ad + widgets) */}
            <div className="hidden lg:block">
              <BlogSidebar post={post} headings={headings} />
            </div>
          </div>
        </Container>
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="border-t border-border bg-surface/70">
          <Container className="max-w-6xl py-14 md:py-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Keep learning</p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text md:text-3xl">
                  More guides you&apos;ll love
                </h2>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
              >
                All articles <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-7 grid gap-5 md:grid-cols-3">
              {related.map((item) => <BlogCard key={item.slug} post={item} compact />)}
            </div>
          </Container>
        </section>
      )}

      {/* Back to top */}
      <BackToTop />
    </main>
  );
}
