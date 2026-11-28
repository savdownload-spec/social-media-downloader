import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { tools } from '@/config/tools';
import { catalog } from '@/config/catalog';
import { getPublicBlogPosts } from '@/lib/blog';
import { prisma } from '@/lib/prisma';

// Regenerate periodically so newly published posts, authors, and tools enter
// the sitemap without waiting for the next deployment.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const [posts, authors] = await Promise.all([
    getPublicBlogPosts(),
    prisma.blogAuthor
      .findMany({
        where: { published: true, isSample: false },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/tools`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/authors`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/faq`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/search`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/refund-policy`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/service-policy`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/cookies`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/dmca`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/reviews`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/affiliates`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Every tool slug resolves to a real 200 page — including tools with a
  // COMING_SOON, MAINTENANCE, or DISABLED admin status. Status is a UI state,
  // not an indexing signal, so none of them are withheld from the sitemap.
  const toolSlugs = new Set<string>(catalog.map((tool) => tool.slug));
  for (const tool of tools) toolSlugs.add(tool.slug);
  const toolRoutes: MetadataRoute.Sitemap = Array.from(toolSlugs).map((slug) => ({
    url: `${base}/tools/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // noIndex is an explicit editorial exclusion; never submit those URLs.
  const postRoutes: MetadataRoute.Sitemap = posts.filter((post) => !post.noIndex).map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const authorRoutes: MetadataRoute.Sitemap = authors.map((author) => ({
    url: `${base}/authors/${author.slug}`,
    lastModified: author.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...toolRoutes, ...postRoutes, ...authorRoutes];
}
