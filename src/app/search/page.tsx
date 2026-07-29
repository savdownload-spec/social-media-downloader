'use client';
import { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search as SearchIcon, ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Input } from '@/components/ui/Input';
import { tools } from '@/config/tools';

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
  { title: 'Contact', description: 'Get in touch with us.', href: '/contact', category: 'Support', keywords: ['contact', 'email', 'support'] },
  { title: 'Privacy Policy', description: 'How we handle your data.', href: '/privacy', category: 'Legal', keywords: ['privacy', 'gdpr', 'data'] },
  { title: 'Terms of Service', description: 'The terms of using SavDown.', href: '/terms', category: 'Legal', keywords: ['terms', 'legal'] },
  { title: 'Cookie Disclaimer', description: 'How we use cookies.', href: '/cookies', category: 'Legal', keywords: ['cookies'] },
  { title: 'DMCA', description: 'Copyright takedown policy.', href: '/dmca', category: 'Legal', keywords: ['dmca', 'copyright', 'takedown'] },
];

const toolItems: SearchItem[] = tools.map((t) => ({
  title: t.name,
  description: t.description,
  href: `/tools/${t.slug}`,
  category: 'Tool',
  keywords: t.keywords,
}));

const allItems = [...toolItems, ...staticPages];

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const q = params.get('q');
    if (q) setQuery(q);
  }, [params]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <>
      <div className="mt-8 relative">
        <SearchIcon className="w-4 h-4 text-text-muted absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            const url = e.target.value ? `/search?q=${encodeURIComponent(e.target.value)}` : '/search';
            router.replace(url, { scroll: false });
          }}
          placeholder="Type to search tools, pages, or topics…"
          autoFocus
          className="pl-12 text-base"
          aria-label="Search"
        />
      </div>

      <p className="mt-6 text-sm text-text-muted">
        {results.length} result{results.length === 1 ? '' : 's'}
        {query && <> for "<span className="text-text">{query}</span>"</>}
      </p>

      <div className="mt-6 space-y-3">
        {results.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 p-5 bg-white border border-border rounded-2xl shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  {item.category}
                </span>
              </div>
              <h2 className="font-semibold text-text truncate group-hover:text-primary transition-colors">
                {item.title}
              </h2>
              <p className="mt-0.5 text-sm text-text-muted truncate">
                {item.description}
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-text-muted flex-shrink-0" />
          </Link>
        ))}
        {results.length === 0 && (
          <div className="p-12 bg-surface rounded-2xl text-center">
            <p className="text-text-muted">Nothing matches that search.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Container className="py-24 max-w-3xl">
      <p className="text-sm font-medium text-primary mb-3">Search</p>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
        Find Anything On SavDown.
      </h1>
      <Suspense fallback={<div className="mt-8 h-14 bg-surface rounded-2xl animate-pulse" />}>
        <SearchInner />
      </Suspense>
    </Container>
  );
}
