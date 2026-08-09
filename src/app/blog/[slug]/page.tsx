import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { buildMetadata, jsonLd } from '@/lib/seo';
import { formatDate } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { getTranslations } from 'next-intl/server';
import blogEn from '@/i18n/translations/blog/en.json';

type Props = { params: { slug: string } };

// This page previously called getLocale()/getTranslations() while
// generateStaticParams() only ever returned { slug } — never { locale } —
// with no ancestor route providing its own locale params either. That
// combination made Next.js bail from static generation with a
// DYNAMIC_SERVER_USAGE error, which surfaced as a raw 500 in production
// (same root cause already found and fixed on /tools/[slug]). Locale
// routing is gone now, but kept force-dynamic rather than reintroducing
// generateStaticParams for this route — no static-generation benefit lost.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const posts: any[] = (blogEn as any).posts ?? [];
  const post = posts.find((p: any) => p.slug === params.slug);
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${params.slug}`,
    keywords: post.tags,
    image: `https://picsum.photos/seed/${post.cover}/1200/630`,
  });
}

/** Bold (**text**) inline formatting only, content is trusted, authored in-repo. */
function inline(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderContent(content: string) {
  const out: React.ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (para.length) {
      out.push(<p key={key++} dangerouslySetInnerHTML={{ __html: inline(para.join(' ')) }} />);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      const items = list;
      out.push(
        <ul key={key++}>
          {items.map((it, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inline(it) }} />
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
    } else if (line.startsWith('### ')) {
      flushPara();
      flushList();
      out.push(<h3 key={key++}>{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      flushPara();
      flushList();
      out.push(<h2 key={key++}>{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      flushPara();
      flushList();
      out.push(<h1 key={key++}>{line.slice(2)}</h1>);
    } else if (line.startsWith('- ')) {
      flushPara();
      list.push(line.slice(2));
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out;
}

export default async function BlogPostPage({ params }: Props) {
  const t = await getTranslations('blog');

  const posts: any[] = (blogEn as any).posts ?? [];
  const post = posts.find((p: any) => p.slug === params.slug);
  if (!post) return notFound();

  const related = posts.filter((p: any) => p.slug !== post.slug).slice(0, 3);

  const articleSchema = {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Organization', name: post.author },
    datePublished: post.publishedAt,
    image: `https://picsum.photos/seed/${post.cover}/1200/630`,
    publisher: { '@type': 'Organization', name: siteConfig.name },
    mainEntityOfPage: `${siteConfig.url}/blog/${post.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(articleSchema)} />

      <Container className="pt-16 md:pt-20 max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {t('backToBlog') || 'All articles'}
        </Link>

        <div className="flex items-center gap-2 text-xs text-text-subtle uppercase tracking-wider mb-3">
          <span>{formatDate(new Date(post.publishedAt))}</span>
          <span>·</span>
          <span>{post.readingTime}</span>
          <span>·</span>
          <span>by {post.author}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-text-muted leading-relaxed">{post.excerpt}</p>

        <div className="mt-6 flex items-center gap-2 flex-wrap">
          {post.tags.map((tag: string) => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-primary-light text-primary font-medium">
              {tag}
            </span>
          ))}
        </div>
      </Container>

      <Container className="mt-10 max-w-4xl">
        <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-border shadow-soft-lg bg-surface">
          <img
            src={`https://picsum.photos/seed/${post.cover}/1200/675`}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      </Container>

      <Container className="max-w-3xl">
        <article className="prose-elegant mt-12">{renderContent(post.content)}</article>

        {/* CTA */}
        <div className="mt-14 rounded-3xl bg-gradient-brand bg-[length:200%_200%] animate-gradient text-white p-8 md:p-10 text-center shadow-glow-lg">
          <h2 className="text-2xl font-bold tracking-tight">{t('ctaTitle') || 'Ready To Save A Video?'}</h2>
          <p className="mt-2 text-white/80">{t('ctaDesc') || 'Try our free, watermark-free downloaders, no signup required.'}</p>
          <Link
            href="/#tools"
            className="inline-flex items-center mt-6 px-6 py-3 rounded-2xl bg-white text-text font-semibold shadow-soft-md hover:shadow-soft-lg transition-all"
          >
            {t('ctaButton') || 'Browse all tools'}
          </Link>
        </div>
      </Container>

      {/* Related */}
      <Container className="py-24 max-w-6xl">
        <h2 className="text-2xl font-bold tracking-tight mb-8">{t('keepReading') || 'Keep Reading'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {related.map((p: any) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-border shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative aspect-[16/10] bg-surface overflow-hidden">
                <img
                  src={`https://picsum.photos/seed/${p.cover}/600/380`}
                  alt={p.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <h3 className="font-bold text-text tracking-tight group-hover:text-primary transition-colors">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed line-clamp-2">{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
