import { Container } from '@/components/layout/Container';
import { BlogListingClient } from '@/components/blog/BlogListingClient';
import { getPublicBlogPosts } from '@/lib/blog';

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  const posts = await getPublicBlogPosts();
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border bg-gradient-mesh">
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden="true" />
        <Container className="relative max-w-6xl py-16 md:py-20">
          <div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">SavDown journal</p><h1 className="mt-4 font-display text-4xl font-semibold leading-[1.04] tracking-tight text-text md:text-6xl">Useful guides for saving, creating, and sharing content responsibly.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-text-muted md:text-lg">Thoughtful downloader guides, creator workflows, format tips, and practical answers for everyday media tasks.</p></div>
        </Container>
      </section>
      <Container className="max-w-6xl py-10 md:py-14"><BlogListingClient posts={posts} /></Container>
    </main>
  );
}