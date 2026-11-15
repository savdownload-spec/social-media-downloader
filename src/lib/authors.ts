import { prisma } from '@/lib/prisma';
import { getPublicBlogPosts } from '@/lib/blog';
import type { BlogPost } from '@/config/blog';
import {
  normalizeHttpUrl,
  parseExpertise,
  parseSocials,
  type PublicAuthor,
} from '@/lib/author-profile';

const AUTHOR_PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  role: true,
  profileImage: true,
  shortBio: true,
  extendedBio: true,
  expertiseJson: true,
  website: true,
  socialsJson: true,
  isSample: true,
  published: true,
  updatedAt: true,
} as const;

type AuthorRecord = {
  id: string;
  name: string;
  slug: string;
  role: string;
  profileImage: string | null;
  shortBio: string | null;
  extendedBio: string | null;
  expertiseJson: string;
  website: string | null;
  socialsJson: string;
  isSample: boolean;
  published: boolean;
  updatedAt: Date;
};

function toPublicAuthor(author: AuthorRecord, articleCount: number): PublicAuthor {
  return {
    id: author.id,
    name: author.name,
    slug: author.slug,
    role: author.role,
    profileImage: author.profileImage,
    shortBio: author.shortBio,
    extendedBio: author.extendedBio,
    expertise: parseExpertise(author.expertiseJson),
    website: author.website ? normalizeHttpUrl(author.website) : null,
    socials: parseSocials(author.socialsJson),
    articleCount,
    isSample: author.isSample,
    updatedAt: author.updatedAt.toISOString(),
  };
}

/**
 * A post belongs to an author by explicit relation when available, otherwise
 * by the legacy display-name field. Static catalog posts have no authorId, so
 * the name fallback keeps "The SavDown Team" articles attached to its profile.
 */
export function authorPostMatches(
  post: Pick<BlogPost, 'author' | 'authorProfile'>,
  author: Pick<PublicAuthor, 'name' | 'slug'>,
): boolean {
  if (post.authorProfile) return post.authorProfile.slug === author.slug;
  return post.author.trim().toLowerCase() === author.name.trim().toLowerCase();
}

export async function getPublishedAuthors(): Promise<
  Array<Omit<PublicAuthor, 'articleCount'>>
> {
  try {
    const authors = await prisma.blogAuthor.findMany({
      where: { published: true },
      orderBy: { name: 'asc' },
      select: AUTHOR_PUBLIC_SELECT,
    });
    return authors.map((author) => toPublicAuthor(author, 0));
  } catch {
    return [];
  }
}

export async function getPublicAuthorsWithCounts(): Promise<PublicAuthor[]> {
  try {
    const [authors, posts] = await Promise.all([
      prisma.blogAuthor.findMany({
        where: { published: true },
        orderBy: { name: 'asc' },
        select: AUTHOR_PUBLIC_SELECT,
      }),
      getPublicBlogPosts(),
    ]);
    return authors
      .map((author) => {
        const publicAuthor = toPublicAuthor(author, 0);
        const articleCount = posts.filter((post) => authorPostMatches(post, publicAuthor)).length;
        return { ...publicAuthor, articleCount };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export type AuthorLookup =
  | { status: 'ok'; author: PublicAuthor }
  | { status: 'redirect'; to: string }
  | { status: 'missing' };

export async function lookupPublicAuthor(slug: string): Promise<AuthorLookup> {
  try {
    const author = await prisma.blogAuthor.findUnique({
      where: { slug },
      select: AUTHOR_PUBLIC_SELECT,
    });

    if (author) {
      if (!author.published) return { status: 'missing' };
      return { status: 'ok', author: toPublicAuthor(author, 0) };
    }

    const redirect = await prisma.authorSlugRedirect.findUnique({
      where: { oldSlug: slug },
      select: { author: { select: { slug: true, published: true } } },
    });
    if (redirect?.author.published && redirect.author.slug !== slug) {
      return { status: 'redirect', to: redirect.author.slug };
    }
    return { status: 'missing' };
  } catch {
    return { status: 'missing' };
  }
}

export async function getAuthorPosts(author: Pick<PublicAuthor, 'name' | 'slug'>) {
  const posts = await getPublicBlogPosts();
  return posts.filter((post) => authorPostMatches(post, author));
}
