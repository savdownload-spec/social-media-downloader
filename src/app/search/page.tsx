'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowUpRight, Search as SearchIcon } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Input } from '@/components/ui/Input';
import { tools } from '@/config/tools';
import { blogPosts } from '@/config/blog';

type SearchItem = {
  title: string;
  description: string;
  href: string;
  category: string;
  keywords: string[];
};

const staticPages: SearchItem[] = [
  { title: 'About', description: 'Who we are and what we stand for.', href: '/about', category: 'Company', keywords: ['about', 'company', 'team'] },
  { title: 'Pricing', description: 'Simple credit-based plans for power users.', href: '/pricing', category: 'Product', keywords: ['pricing', 'plans', 'credits', 'pro', 'upgrade'] },
  { title: 'Blog', description: 'Guides and stories on downloading media.', href: '/blog', category: 'Content', keywords: ['blog', 'articles', 'guides'] },
  { title: 'FAQ', description: 'Common questions and answers.', href: '/faq', category: 'Support', keywords: ['faq', 'help', 'questions'] },
  { title: 'Contact Us', description: 'Get in touch with us.', href: '/contact', category: 'Support', keywords: ['contact', 'email', 'support'] },
  { title: 'Privacy Policy', description: 'How we handle your data.', href: '/privacy', category: 'Legal', keywords: ['privacy', 'gdpr', 'data'] },
  { title: 'Terms of Service', description: 'The terms of using SavDown.', href: '/terms', category: 'Legal', keywords: ['terms', 'legal'] },
  { title: 'Cookie Disclaimer', description: 'How we use cookies.', href: '/cookies', category: 'Legal', keywords: ['cookies'] },
  { title: 'DMCA', description: 'Copyright takedown policy.', href: '/dmca', category: 'Legal', keywords: ['dmca', 'copyright', 'takedown'] },
];

const toolItems: SearchItem[] = tools.map((tool) => ({
  title: tool.name,
  description: tool.description,
  href: `/tools/${tool.slug}`,
  category: 'Tool',
  keywords: tool.keywords,
}));

const blogItems: SearchItem[] = blogPosts.map((post) => ({
  title: post.title,
  description: post.excerpt,
  href: `/blog/${post.slug}`,
  category: `Blog · ${post.category}`,
  keywords: [post.primaryKeyword, ...post.secondaryKeywords, ...post.tags],
}));

const allItems = [...blogItems, ...toolItems, ...staticPages];

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const value = params.get('q');
    if (value) setQuery(value);
  }, [params]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return allItems;
    return allItems.filter((item) => item.title.toLowerCase().includes(normalized) || item.description.toLowerCase().includes(normalized) || item.keywords.some((keyword) => keyword.toLowerCase().includes(normalized)));
  }, [query]);

  return (
    <>
      <div className="relative mt-8">
        <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <Input value={query} onChange={(event) => { setQuery(event.target.value); router.replace(event.target.value ? `/search?q=${encodeURIComponent(event.target.value)}` : '/search', { scroll: false }); }} placeholder="Type to search tools, articles, or topics…" autoFocus className="pl-12 text-base" aria-label="Search" />
      </div>
      <p className="mt-6 text-sm text-text-muted">{results.length} result{results.length === 1 ? '' : 's'}{query && <> for <span className="text-text">&quot;{query}&quot;</span></>}</p>
      <div className="mt-6 space-y-3">
        {results.map((item) => (
          <Link key={item.href} href={item.href} className="group flex items-center gap-4 rounded-2xl border border-border bg-white dark:bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg">
            <div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><span className="text-xs font-medium uppercase tracking-wider text-text-muted">{item.category}</span></div><h2 className="truncate font-semibold text-text transition-colors group-hover:text-primary">{item.title}</h2><p className="mt-0.5 truncate text-sm text-text-muted">{item.description}</p></div>
            <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-text-muted" aria-hidden="true" />
          </Link>
        ))}
        {results.length === 0 && <div className="rounded-2xl bg-surface p-12 text-center"><p className="text-text-muted">Nothing matches that search.</p></div>}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Container className="max-w-3xl py-24">
      <Breadcrumb
        className="mb-8"
        includeSchema
        items={[
          { label: 'Home', href: '/' },
          { label: 'Search' },
        ]}
      />
      <p className="mb-3 text-sm font-medium text-primary">Search</p>
      <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">Find Anything On SavDown.</h1>
      <Suspense fallback={<div className="mt-8 h-14 animate-pulse rounded-2xl bg-surface" />}><SearchInner /></Suspense>
    </Container>
  );
}


