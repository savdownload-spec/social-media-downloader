import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AuthorsDirectory } from '@/components/authors/AuthorsDirectory';
import { getPublicAuthorsWithCounts } from '@/lib/authors';
import { buildMetadata, jsonLd } from '@/lib/seo';
import { siteConfig } from '@/config/site';

const DESCRIPTION =
  "Meet the people behind SavDown's guides, tutorials, and insights. Explore their expertise and discover the articles they have written.";

export const metadata: Metadata = buildMetadata({
  title: 'Meet Our Authors',
  description: DESCRIPTION,
  path: '/authors',
  keywords: ['SavDown authors', 'SavDown editorial team', 'content writers', 'video downloader guides'],
});

export const dynamic = 'force-dynamic';

export default async function AuthorsPage() {
  const authors = await getPublicAuthorsWithCounts();
  const totalArticles = authors.reduce((sum, author) => sum + author.articleCount, 0);
  const totalExpertise = new Set(authors.flatMap((author) => author.expertise)).size;

  const collectionSchema = {
    '@type': 'CollectionPage',
    name: 'Meet Our Authors',
    description: DESCRIPTION,
    url: `${siteConfig.url}/authors`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: authors.length,
      itemListElement: authors.map((author, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: author.name,
        url: `${siteConfig.url}/authors/${author.slug}`,
      })),
    },
  };

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border bg-gradient-mesh dark:bg-gradient-mesh-dark">
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden="true" />
        <Container className="relative max-w-6xl py-16 md:py-20">
          <Breadcrumb
            className="mb-8"
            includeSchema
            items={[
              { label: 'Home', href: '/' },
              { label: 'Authors', href: '/authors' },
            ]}
          />

          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">SavDown authors</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.04] tracking-tight text-text md:text-6xl">
              Meet Our <span className="text-gradient">Authors</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-muted md:text-lg">{DESCRIPTION}</p>
          </div>

          {authors.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                { label: authors.length === 1 ? 'Author' : 'Authors', value: authors.length },
                { label: totalArticles === 1 ? 'Published article' : 'Published articles', value: totalArticles },
                { label: 'Areas of expertise', value: totalExpertise },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="inline-flex items-baseline gap-2 rounded-2xl border border-border bg-white/70 px-4 py-3 shadow-soft backdrop-blur dark:bg-card/70"
                >
                  <span className="font-display text-xl font-semibold text-text">{stat.value}</span>
                  <span className="text-xs font-medium text-text-muted">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
        </Container>
      </section>

      <Container className="max-w-6xl py-10 md:py-14">
        <AuthorsDirectory authors={authors} />
      </Container>

      {authors.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(collectionSchema)} />
      )}
    </main>
  );
}
