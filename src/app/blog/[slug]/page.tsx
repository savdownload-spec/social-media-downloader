import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, RefreshCw } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogComments } from '@/components/blog/BlogComments';
import { BlogCover } from '@/components/blog/BlogCover';
import { BlogPostBody, getHeadingsForPost } from '@/components/blog/BlogPostBody';
import { BlogShare } from '@/components/blog/BlogShare';
import { BlogShareRail } from '@/components/blog/BlogShareRail';
import { BlogSidebar } from '@/components/blog/BlogSidebar';
import { AuthorCard } from '@/components/blog/AuthorCard';
import { ArticleFeedback } from '@/components/blog/ArticleFeedback';
import { ArticleNavigation } from '@/components/blog/ArticleNavigation';
import { ReadingProgressBar } from '@/components/blog/ReadingProgressBar';
import { StickyArticleHeader } from '@/components/blog/StickyArticleHeader';
import { BackToTop } from '@/components/blog/BackToTop';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { buildMetadata, breadcrumbSchema, canonicalUrl as resolveCanonicalUrl, jsonLd } from '@/lib/seo';
import { buildFaqSchema, buildHowToSchema } from '@/lib/content-studio/schema';
import { getPublicBlogPosts } from '@/lib/blog';
import { formatDate } from '@/lib/utils';
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

export async function generateMetadata({ params }: Props) {
  const allPosts = await getPublicBlogPosts();
  const post = allPosts.find((p) => p.slug === params.slug);
  if (!post) return {};

  const image = post.ogImage || (post.coverImage ? `${siteConfig.url}${post.coverImage}` : undefined);

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
    modifiedTime: post.updatedAt,
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
  const categories = Array.from(new Set(allPosts.map((item) => item.category)));
  const canonicalPath = post.canonicalUrl || `/blog/${post.slug}`;
  const canonicalUrl = resolveCanonicalUrl(canonicalPath);
  const image = post.ogImage || `${siteConfig.url}${post.coverImage}`;
  const categoryPath = `/blog?category=${encodeURIComponent(post.category)}`;

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
      ...(post.authorProfile
        ? { url: `${siteConfig.url}/blog/author/${post.authorProfile.slug}` }
        : {}),
    },
    datePublished: post.publishedAt,
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
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

  const sentinelId = `hero-sentinel-${post.slug.slice(0, 20)}`;

  return (
    <main>
      {/* JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(articleSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema(crumbs))} />
      {faqSchemaData && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchemaData)} />}
      {howToSchemaData && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(howToSchemaData)} />}

      {/* Reading progress (client-only) */}
      <ReadingProgressBar />

      {/* Compact sticky header after scrolling past hero */}
      <StickyArticleHeader title={post.title} readingTime={post.readingTime} sentinelId={sentinelId} />

      {/* Article hero */}
      <Container className="max-w-6xl pt-10 md:pt-14">
        <Breadcrumb
          className="mb-8"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: post.category, href: categoryPath },
            { label: breadcrumbLabel },
          ]}
        />

        <header className="mx-auto max-w-4xl pb-9 text-center md:pb-12">
          {/* Category badge */}
          <Link
            href={categoryPath}
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition-colors hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: 'rgb(var(--primary) / 0.1)',
              color: 'rgb(var(--primary))',
              outlineColor: 'rgb(var(--primary) / 0.5)',
            }}
          >
            {post.category}
          </Link>

          {/* Title */}
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.04] tracking-tight text-text md:text-6xl">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-text-muted md:text-lg">
            {post.excerpt}
          </p>

          {/* Author + meta row */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-text-muted">
            {post.authorProfile ? (
              <Link
                href={`/blog/author/${post.authorProfile.slug}`}
                className="inline-flex items-center gap-1.5 hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 rounded"
                style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                  style={{ background: 'rgb(var(--primary))' }}
                  aria-hidden="true"
                >
                  {post.authorProfile.name.charAt(0)}
                </span>
                {post.authorProfile.name}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: 'rgb(var(--primary))' }}
                  aria-hidden="true"
                >
                  {post.author.charAt(0)}
                </span>
                {post.author}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Published {formatDate(new Date(post.publishedAt))}
            </span>
            {post.updatedAt && (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Updated {formatDate(new Date(post.updatedAt))}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              {post.readingTime}
            </span>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="blog-tag-pill">{tag}</span>
              ))}
            </div>
          )}

          {/* Share (mobile / non-XL — XL shows the rail) */}
          <div className="mt-7 flex justify-center xl:hidden">
            <BlogShare title={post.seoTitle || post.title} description={post.metaDescription || post.excerpt} />
          </div>
        </header>

        <BlogCover post={post} priority className="aspect-[16/8] rounded-3xl border border-border shadow-soft-lg" />
      </Container>

      {/* Sentinel for sticky header IntersectionObserver */}
      <div id={sentinelId} aria-hidden="true" />

      {/* 3-column grid: [share rail | article | TOC sidebar] */}
      <Container className="max-w-6xl py-12 md:py-16">
        <div className="grid gap-10 xl:grid-cols-[56px_minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">

          {/* Left column: share rail (XL only) */}
          <div className="hidden xl:flex xl:flex-col xl:items-center xl:pt-10">
            <BlogShareRail title={post.seoTitle || post.title} />
          </div>

          {/* Center column: article */}
          <article className="min-w-0 rounded-3xl border border-border bg-white dark:bg-card p-6 shadow-soft md:p-10 max-w-[720px] mx-auto w-full">
            <BlogPostBody post={post} />

            {/* CTA block */}
            <div className="mt-10 rounded-2xl bg-gradient-brand p-7 text-center text-white shadow-glow-lg md:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Save it when you need it</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Ready to use SavDown?</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/80">
                Paste a public link, choose an available format, and keep your media workflow simple.
              </p>
              <Link
                href={post.toolSlug ? `/tools/${post.toolSlug}` : '/tools'}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Try SavDown Free <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {/* Article feedback */}
            <ArticleFeedback postSlug={post.slug} />

            {/* Author card */}
            {post.authorProfile && (
              <AuthorCard authorProfile={post.authorProfile} />
            )}

            {/* Prev / Next navigation */}
            <ArticleNavigation prevPost={prevPost} nextPost={nextPost} />

            {/* Comments */}
            <BlogComments postSlug={post.slug} />
          </article>

          {/* Right column: sidebar (TOC + widgets) — spans both lg and xl right columns */}
          <div className="hidden lg:block">
            <BlogSidebar post={post} headings={headings} categories={categories} />
          </div>
        </div>
      </Container>

      {/* Related articles */}
      <Container className="max-w-6xl pb-16 md:pb-24">
        {related.length > 0 && (
          <section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Continue exploring</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">Related articles</h2>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover">
                All articles <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {related.map((item) => <BlogCard key={item.slug} post={item} compact />)}
            </div>
          </section>
        )}
      </Container>

      {/* Back to top */}
      <BackToTop />
    </main>
  );
}
