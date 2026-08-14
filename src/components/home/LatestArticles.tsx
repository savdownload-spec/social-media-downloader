'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { useTranslation } from '@/i18n';
import type { BlogPost } from '@/config/blog';
import { BlogCard } from '@/components/blog/BlogCard';

export function LatestArticles({ posts = [] }: { posts?: BlogPost[] }) {
  const t = useTranslation();
  const visiblePosts = posts.slice(0, 3);

  if (visiblePosts.length === 0) return null;

  return (
    <Section variant="default" id="blog">
      <div className="mb-14 flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div className="mx-auto max-w-xl sm:mx-0">
          <p className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-gradient">
            {t('blog.eyebrow') || 'From the blog'}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-text md:text-4xl">
            {t('blog.title') || 'Guides, Tips, And Good Habits.'}
          </h2>
        </div>
        <Link href="/blog" className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-text transition-colors hover:text-primary">
          {t('blog.backToBlog') || 'All articles'} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {visiblePosts.map((post, index) => (
          <Reveal key={post.slug} delay={index * 0.06}>
            <BlogCard post={post} compact />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
