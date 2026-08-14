import { prisma } from '@/lib/prisma';
import { blogPosts, type BlogPost } from '@/config/blog';

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function normalizeDbPost(post: {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  author: string;
  tagsJson: string;
  category: string;
  coverAlt: string | null;
  ogImage: string | null;
  primaryKeyword: string | null;
  secondaryKeywordsJson: string;
  canonicalUrl: string | null;
  toolSlug: string | null;
  readingTimeMinutes: number | null;
  publishedAt: Date | null;
  updatedAt: Date;
}): BlogPost {
  const tags = parseJsonArray(post.tagsJson);
  const secondaryKeywords = parseJsonArray(post.secondaryKeywordsJson);
  const publishedAt = (post.publishedAt ?? post.updatedAt).toISOString().slice(0, 10);
  const readingTime = post.readingTimeMinutes ? `${post.readingTimeMinutes} min read` : '5 min read';

  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? '',
    author: post.author,
    publishedAt,
    updatedAt: post.updatedAt.toISOString().slice(0, 10),
    readingTime,
    tags,
    category: post.category || 'Guides',
    coverImage: post.coverImage || '/og-default.svg',
    coverAlt: post.coverAlt || post.title,
    ogImage: post.ogImage || undefined,
    content: post.content,
    seoTitle: post.title,
    metaDescription: post.excerpt ?? post.title,
    primaryKeyword: post.primaryKeyword ?? tags[0] ?? 'SavDown guide',
    secondaryKeywords,
    canonicalUrl: post.canonicalUrl || undefined,
    toolSlug: post.toolSlug || undefined,
  };
}

/**
 * Static records are the source of truth for the shipped editorial catalog.
 * Published DB records are overlaid by slug so admin-created or edited articles
 * appear in the same public experience without duplicating rendering logic.
 */
export async function getPublicBlogPosts(): Promise<BlogPost[]> {
  try {
    const published = await prisma.post.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      select: {
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        coverImage: true,
        author: true,
        tagsJson: true,
        category: true,
        coverAlt: true,
        ogImage: true,
        primaryKeyword: true,
        secondaryKeywordsJson: true,
        canonicalUrl: true,
        toolSlug: true,
        readingTimeMinutes: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    const dbPosts = published.map(normalizeDbPost);
    const dbBySlug = new Map(dbPosts.map((post) => [post.slug, post]));
    const merged = blogPosts.map((post) => dbBySlug.get(post.slug) ?? post);
    const dbOnly = dbPosts.filter((post) => !blogPosts.some((staticPost) => staticPost.slug === post.slug));

    return [...merged, ...dbOnly].sort(
      (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
    );
  } catch {
    // Public pages should remain available during a database cold start or
    // before the optional editorial columns have been migrated.
    return blogPosts;
  }
}

export async function getPublicBlogPost(slug: string): Promise<BlogPost | undefined> {
  const posts = await getPublicBlogPosts();
  return posts.find((post) => post.slug === slug);
}
