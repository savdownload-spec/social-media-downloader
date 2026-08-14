import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import { toolsBySlug } from '@/config/tools';

export function BlogPromoCard({ post }: { post: BlogPost }) {
  const tool = post.toolSlug ? toolsBySlug.get(post.toolSlug) : undefined;
  if (!tool) return null;

  return (
    <aside className="relative overflow-hidden rounded-2xl bg-ink-900 p-6 text-white shadow-soft-lg">
      <div className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-primary/35 blur-3xl" aria-hidden="true" />
      <div className="relative">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          SavDown tool
        </span>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">Try the {tool.name}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{tool.description}</p>
        <Link
          href={`/tools/${tool.slug}`}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:bg-indigo-50"
        >
          Open the downloader
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
