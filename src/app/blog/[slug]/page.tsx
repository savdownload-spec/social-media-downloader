import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, UserRound } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { BlogAdSlot } from '@/components/blog/BlogAdSlot';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogCover } from '@/components/blog/BlogCover';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { BlogPostBody } from '@/components/blog/BlogPostBody';
import { BlogSidebar } from '@/components/blog/BlogSidebar';
import { buildMetadata, breadcrumbSchema, jsonLd } from '@/lib/seo';
import { getPublicBlogPost, getPublicBlogPosts } from '@/lib/blog';
import { formatDate } from '@/lib/utils';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

function relatedTo(post: Awaited<ReturnType<typeof getPublicBlogPost>> extends infer T ? Exclude<T, undefined> : never, candidates: Awaited<ReturnType<typeof getPublicBlogPosts>>) {
  return candidates
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => post.tags.includes(tag)).length;
      const score = sharedTags * 3 + (candidate.category === post.category ? 4 : 0) + (candidate.toolSlug === post.toolSlug ? 2 : 0);
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || +new Date(b.candidate.publishedAt) - +new Date(a.candidate.publishedAt))
    .slice(0, 3)
    .map(({ candidate }) => candidate);
}

export async function generateMetadata({ params }: Props) {
  const post = await getPublicBlogPost(params.slug);
  if (!post) return {};

  return buildMetadata({
    title: post.seoTitle,
    description: post.metaDescription,
    path: post.canonicalUrl || `/blog/${post.slug}`,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords, ...post.tags],
    image: post.ogImage || post.coverImage,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const [post, allPosts] = await Promise.all([getPublicBlogPost(params.slug), getPublicBlogPosts()]);
  if (!post) notFound();

  const related = relatedTo(post, allPosts);
  const canonicalPath = post.canonicalUrl || `/blog/${post.slug}`;
  const canonicalUrl = canonicalPath.startsWith('http') ? canonicalPath : `${siteConfig.url}${canonicalPath}`;
  const image = post.ogImage || `${siteConfig.url}${post.coverImage}`;
  const categoryPath = `/blog?category=${encodeURIComponent(post.category)}`;
  const categoryUrl = `${siteConfig.url}${categoryPath}`;
  const articleSchema = {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription,
    author: { '@type': 'Organization', name: post.author },
    datePublished: post.publishedAt,
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
    image,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords, ...post.tags].join(', '),
    publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  };
  const crumbs = [
    { name: 'Home', url: siteConfig.url },
    { name: 'Blog', url: `${siteConfig.url}/blog` },
    { name: post.title, url: canonicalUrl },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(articleSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema(crumbs))} />

      <Container className="max-w-6xl pt-10 md:pt-14">
        <Breadcrumb
          className="mb-8 justify-start px-0"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: post.category, href: categoryPath },
            { label: post.title },
          ]}
        />
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to articles
        </Link>

        <header className="mx-auto max-w-4xl py-9 text-center md:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{post.category}</p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.04] tracking-tight text-text md:text-6xl">
            {post.title}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-text-muted md:text-lg">{post.excerpt}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-text-muted">
            <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4" aria-hidden="true" />{post.author}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDate(new Date(post.publishedAt))}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" aria-hidden="true" />{post.readingTime}</span>
          </div>
          {post.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {post.tags.map((tag) => <span key={tag} className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-medium text-primary">{tag}</span>)}
            </div>
          )}
        </header>

        <BlogCover post={post} priority className="aspect-[16/8] rounded-3xl border border-border shadow-soft-lg" />
      </Container>

      <Container className="max-w-6xl py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <article className="min-w-0 rounded-3xl border border-border bg-white p-6 shadow-soft md:p-10">
            <BlogPostBody post={post} />
            <div className="mt-10 rounded-2xl bg-gradient-brand p-7 text-center text-white shadow-glow-lg md:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Save it when you need it</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Ready to download media with SavDown?</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/80">Paste a public link, choose an available format, and keep your workflow simple.</p>
              <Link href={post.toolSlug ? `/tools/${post.toolSlug}` : '/tools'} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-indigo-50">
                Try SavDown free <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </article>

          <BlogSidebar post={post} related={related} />
        </div>
      </Container>

      <Container className="max-w-6xl pb-16 md:pb-24">
        <BlogAdSlot slot="SECONDARY_AD" />
        {related.length > 0 && (
          <section className="mt-14">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Continue exploring</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">Related articles</h2>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover">All articles <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {related.map((item) => <BlogCard key={item.slug} post={item} compact />)}
            </div>
          </section>
        )}
      </Container>
    </main>
  );
}



