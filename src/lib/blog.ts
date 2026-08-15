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

function parseFaqOrHowTo<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
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
  // Content Studio additions — all optional so callers that still select the
  // original column set (or rows saved before this migration) keep working.
  contentJson?: unknown;
  seoTitle?: string | null;
  metaDescription?: string | null;
  noIndex?: boolean;
  noFollow?: boolean;
  breadcrumbTitle?: string | null;
  schemaType?: string | null;
  faqJson?: string | null;
  howToJson?: string | null;
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
    // Same fallback chain as before this change (title/excerpt), now backed
    // by explicit columns instead of being implicit here — unedited rows
    // (seoTitle/metaDescription null) render byte-identical to before.
    seoTitle: post.seoTitle || post.title,
    metaDescription: post.metaDescription || post.excerpt || post.title,
    primaryKeyword: post.primaryKeyword ?? tags[0] ?? 'SavDown guide',
    secondaryKeywords,
    canonicalUrl: post.canonicalUrl || undefined,
    toolSlug: post.toolSlug || undefined,
    contentJson: post.contentJson ?? undefined,
    noIndex: post.noIndex ?? false,
    noFollow: post.noFollow ?? false,
    breadcrumbTitle: post.breadcrumbTitle || undefined,
    schemaType: post.schemaType || undefined,
    faqItems: parseFaqOrHowTo(post.faqJson),
    howToSteps: parseFaqOrHowTo(post.howToJson),
  };
}

/**
 * Static records are the source of truth for the shipped editorial catalog.
 * Published DB records are overlaid by slug so admin-created or edited articles
 * appear in the same public experience without duplicating rendering logic.
 */
export async function getPublicBlogPosts(): Promise<BlogPost[]> {
  try {
    // Best-effort scheduled publish: no cron infra exists in this project,
    // so a due post goes live the next time this is called (public page
    // view, sitemap build, or an admin visit) rather than at the exact
    // scheduled second.
    await prisma.post
      .updateMany({
        where: { published: false, scheduledAt: { lte: new Date() } },
        data: { published: true, publishedAt: new Date() },
      })
      .catch(() => undefined);

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
        contentJson: true,
        seoTitle: true,
        metaDescription: true,
        noIndex: true,
        noFollow: true,
        breadcrumbTitle: true,
        schemaType: true,
        faqJson: true,
        howToJson: true,
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
