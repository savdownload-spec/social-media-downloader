import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { BlogCard } from '@/components/blog/BlogCard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { buildMetadata } from '@/lib/seo';
import { prisma } from '@/lib/prisma';
import { getPublicBlogPosts } from '@/lib/blog';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

function parseExpertise(json: string): string[] {
  try {
    const parsed = JSON.parse(json || '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const author = await prisma.blogAuthor.findUnique({ where: { slug: params.slug }, select: { name: true, role: true, shortBio: true } });
  if (!author) return {};
  return buildMetadata({
    title: `${author.name} — ${siteConfig.name} Blog`,
    description: author.shortBio || `Articles by ${author.name}, ${author.role} at ${siteConfig.name}.`,
    path: `/blog/author/${params.slug}`,
  });
}

export default async function AuthorPage({ params }: Props) {
  const [author, allPosts] = await Promise.all([
    prisma.blogAuthor.findUnique({
      where: { slug: params.slug },
    }),
    getPublicBlogPosts(),
  ]);

  if (!author) notFound();

  // Filter published posts for this author (match by author string name or by authorId)
  const authorPosts = allPosts.filter(
    (p) => p.authorProfile?.slug === params.slug || p.author === author.name,
  );

  const expertise = parseExpertise(author.expertiseJson);

  return (
    <main>
      <Container className="max-w-5xl pt-10 md:pt-14">
        <Breadcrumb
          className="mb-8"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: author.name },
          ]}
        />

        {/* Author hero */}
        <div className="mb-12 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-6">
          <div className="shrink-0">
            {author.profileImage ? (
              <Image
                src={author.profileImage}
                alt={`${author.name} profile photo`}
                width={120}
                height={120}
                className="rounded-full border-2 border-border object-cover"
                priority
              />
            ) : (
              <div
                className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-2 border-border text-4xl font-bold"
                style={{ background: 'rgb(var(--primary) / 0.08)', color: 'rgb(var(--primary))' }}
                aria-hidden="true"
              >
                {author.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mb-3"
              style={{ background: 'rgb(var(--primary) / 0.1)', color: 'rgb(var(--primary))' }}
            >
              {author.role}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-text md:text-4xl">{author.name}</h1>
            {author.shortBio && (
              <p className="mt-3 text-base leading-7 text-text-muted max-w-2xl">{author.shortBio}</p>
            )}
            {expertise.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                {expertise.map((skill) => (
                  <span key={skill} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted">
                    {skill}
                  </span>
                ))}
              </div>
            )}
            {authorPosts.length > 0 && (
              <p className="mt-4 text-sm text-text-muted">
                <span className="font-semibold text-text">{authorPosts.length}</span> published{' '}
                {authorPosts.length === 1 ? 'article' : 'articles'}
              </p>
            )}
          </div>
        </div>

        {/* Extended bio */}
        {author.extendedBio && (
          <div className="mb-12 rounded-2xl border border-border bg-white dark:bg-card p-6 md:p-8">
            <h2 className="text-lg font-semibold text-text mb-3">About</h2>
            <p className="text-base leading-7 text-text-muted whitespace-pre-line">{author.extendedBio}</p>
          </div>
        )}

        {/* Articles */}
        {authorPosts.length > 0 ? (
          <section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Articles</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text">
                  By {author.name}
                </h2>
              </div>
              <a href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover">
                All articles <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {authorPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-16">
            <p className="text-text-muted">No articles published yet.</p>
          </div>
        )}
      </Container>
    </main>
  );
}
