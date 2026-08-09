import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { formatDate } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import blogEn from '@/i18n/translations/blog/en.json';

export default async function BlogPage() {
  const t = await getTranslations('blog');

  const posts: any[] = (blogEn as any).posts ?? [];
  const [featured, ...rest] = posts;

  return (
    <Container className="py-24 max-w-6xl">
      <div className="max-w-2xl mb-14">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">{t('eyebrow') || 'The Blog'}</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
          {t('title') || 'Guides, Tips & Stories.'}
        </h1>
        <p className="mt-4 text-text-muted leading-relaxed">
          {t('subtitle') || 'Everything we\'ve learned about downloading and repurposing video the right way.'}
        </p>
      </div>

      {/* Featured post */}
      {featured && (
        <Link
          href={`/blog/${featured.slug}`}
          className="group grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-border bg-white shadow-soft hover:shadow-soft-lg transition-all duration-300 mb-8"
        >
          <div className="relative aspect-[16/10] md:aspect-auto bg-surface overflow-hidden">
            <img
              src={`https://picsum.photos/seed/${featured.cover}/900/600`}
              alt={featured.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="p-8 md:p-10 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-xs text-text-subtle uppercase tracking-wider mb-4">
              <span>{formatDate(new Date(featured.publishedAt))}</span>
              <span>·</span>
              <span>{featured.readingTime}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text group-hover:text-primary transition-colors">
              {featured.title}
            </h2>
            <p className="mt-3 text-text-muted leading-relaxed">{featured.excerpt}</p>
            <div className="mt-6 flex items-center gap-2 flex-wrap">
              {featured.tags.map((tag: string) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-primary-light text-primary font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Link>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {rest.map((post: any) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-border shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300"
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
              <h2 className="text-lg font-bold text-text tracking-tight group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-text-muted leading-relaxed flex-1 line-clamp-3">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                {post.tags.slice(0, 2).map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-surface text-text-muted border border-border-light">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Container>
  );
}
