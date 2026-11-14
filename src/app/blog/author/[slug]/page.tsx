import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

// Legacy author URLs from the original blog profile route. The canonical
// author pages now live at /authors/[slug]; the destination route also handles
// old slugs recorded in AuthorSlugRedirect after a rename.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export const dynamic = 'force-dynamic';

export default function LegacyBlogAuthorPage({ params }: { params: { slug: string } }) {
  permanentRedirect(`/authors/${encodeURIComponent(params.slug)}`);
}
