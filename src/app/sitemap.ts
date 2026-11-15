import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { tools } from '@/config/tools';
import { catalog } from '@/config/catalog';
import { getPublicBlogPosts } from '@/lib/blog';
import { getToolPageStatuses, isLiveToolPage } from '@/lib/toolPageAvailability';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();
  const [posts, toolStatuses, authors] = await Promise.all([
    getPublicBlogPosts(),
    getToolPageStatuses(),
    prisma.blogAuthor
      .findMany({
        where: { published: true, isSample: false },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/authors`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/search`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/dmca`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/reviews`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/affiliates`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const toolSlugs = new Set<string>(catalog.map((tool) => tool.slug));
  for (const tool of tools) toolSlugs.add(tool.slug);
  const toolRoutes: MetadataRoute.Sitemap = Array.from(toolSlugs).filter((slug) => isLiveToolPage(slug, toolStatuses)).map((slug) => ({
    url: `${base}/tools/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
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
