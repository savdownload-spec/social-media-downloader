'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';
import { formatDate } from '@/lib/utils';
import { useTranslation } from '@/i18n';

export function LatestArticles({ posts = [] }: { posts?: any[] }) {
  const t = useTranslation();
  const visiblePosts = posts.slice(0, 3);
  
  if (visiblePosts.length === 0) return null;

  return (
    <Section variant="default" id="blog">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14 text-center sm:text-left">
        <div className="mx-auto sm:mx-0 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
            {t('blog.eyebrow') || 'From the blog'}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
            {t('blog.title') || 'Guides, Tips, And Good Habits.'}
          </h2>
        </div>
        <Link
          href="/blog"
          className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-text hover:text-primary transition-colors"
        >
          {t('blog.backToBlog') || 'All articles'} <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {visiblePosts.map((post, i) => (
          <Reveal key={post.slug} delay={i * 0.06}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex flex-col h-full rounded-2xl overflow-hidden bg-white border border-border shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-[16/10] bg-surface overflow-hidden">
                <img
                  src={`https://picsum.photos/seed/${post.cover}/600/380`}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-text-subtle uppercase tracking-wider mb-3">
                  <span>{formatDate(new Date(post.publishedAt))}</span>
                  <span>·</span>
                  <span>{post.readingTime}</span>
                </div>
                <h3 className="text-lg font-bold text-text tracking-tight group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="mt-3 text-sm text-text-muted leading-relaxed flex-1 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="mt-5 flex items-center gap-2 flex-wrap">
                  {post.tags.slice(0, 2).map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full bg-surface text-text-muted border border-border-light"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
