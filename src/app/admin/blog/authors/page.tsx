import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// The legacy blog-author admin screen was replaced by the full authors
// management area. Keep the old URL working for existing bookmarks.
export default function LegacyAdminBlogAuthorsPage() {
  redirect('/admin/authors');
}
