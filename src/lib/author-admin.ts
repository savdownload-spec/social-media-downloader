/**
 * Server-side helpers shared by the admin author routes. Validation is kept
 * here (not in the client form) so direct API calls cannot bypass it.
 */

import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  AUTHOR_SLUG_PATTERN,
  normalizeExpertiseList,
  normalizeHttpUrl,
  parseExpertise,
  parseSocials,
  serializeExpertise,
  serializeSocials,
  slugifyAuthorName,
  validateSocialLinks,
  type AuthorSocialLink,
} from '@/lib/author-profile';

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const authorPayloadSchema = z.object({
  name: z.string().max(200),
  slug: z.string().max(200).optional().nullable(),
  email: z.string().max(320).optional().nullable(),
  role: z.string().max(200).optional().nullable(),
  shortBio: z.string().max(2000).optional().nullable(),
  extendedBio: z.string().max(30000).optional().nullable(),
  profileImage: z.string().max(2048).optional().nullable(),
  website: z.string().max(2048).optional().nullable(),
  // Preferred shapes.
  expertise: z.array(z.string()).optional().nullable(),
  socials: z.array(z.object({ platform: z.string(), url: z.string() })).optional().nullable(),
  published: z.boolean().optional(),
  // Legacy JSON-string shapes kept for API compatibility.
  expertiseJson: z.string().optional().nullable(),
  socialsJson: z.string().optional().nullable(),
});

export type AuthorPayload = z.infer<typeof authorPayloadSchema>;

export type AuthorMutation = {
  name: string;
  slug?: string;
  email: string | null;
  role: string;
  shortBio: string | null;
  extendedBio: string | null;
  profileImage: string | null;
  website: string | null;
  expertiseJson: string;
  socialsJson: string;
  published?: boolean;
};

function cleanText(value: string) {
  return value.replace(CONTROL_CHARS, '').trim();
}

function cleanOptional(value: string | null | undefined, max: number) {
  if (value === null || value === undefined) return null;
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}

/** Accepts absolute http(s) URLs and site-relative /images paths. */
function safeProfileImage(value: string | null | undefined): string | null | false {
  if (value === null || value === undefined) return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith('//') || raw.includes('\\') || raw.split('/').includes('..')) return false;
  if (raw.startsWith('/')) return raw;
  return normalizeHttpUrl(raw) ?? false;
}

function parseJsonArray(value: string | null | undefined): unknown[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function parseAuthorMutation(
  input: AuthorPayload,
  options: { requireSlug?: boolean } = {},
): { ok: true; value: AuthorMutation } | { ok: false; error: string } {
  const name = cleanText(input.name);
  if (name.length < 2) return { ok: false, error: 'Name must be at least 2 characters.' };
  if (name.length > 80) return { ok: false, error: 'Name must be 80 characters or fewer.' };

  const rawSlug = input.slug === undefined || input.slug === null ? '' : cleanText(input.slug);
  if (rawSlug && !AUTHOR_SLUG_PATTERN.test(rawSlug)) {
    return { ok: false, error: 'Slug must use lowercase letters, numbers, and single hyphens.' };
  }
  if (rawSlug.length > 80) return { ok: false, error: 'Slug must be 80 characters or fewer.' };
  if (options.requireSlug && !rawSlug) return { ok: false, error: 'Slug is required.' };

  const email = cleanOptional(input.email, 200);
  if (email && !z.string().email().safeParse(email).success) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  const role = cleanOptional(input.role, 80) ?? 'Author';
  const shortBio = cleanOptional(input.shortBio, 300);
  const extendedBio = cleanOptional(input.extendedBio, 20000);

  const profileImage = safeProfileImage(input.profileImage);
  if (profileImage === false) {
    return { ok: false, error: 'Profile image must be an uploaded file or a valid http(s) URL.' };
  }

  let website: string | null = null;
  if (input.website && input.website.trim()) {
    website = normalizeHttpUrl(input.website);
    if (!website) return { ok: false, error: 'Website must be a valid http(s) URL.' };
  }

  let expertiseInput: unknown[] = [];
  if (Array.isArray(input.expertise)) {
    expertiseInput = input.expertise;
  } else if (input.expertiseJson) {
    const parsed = parseJsonArray(input.expertiseJson);
    if (!parsed) return { ok: false, error: 'Expertise must be a list of labels.' };
    expertiseInput = parsed;
  }
  if (expertiseInput.length > 12) {
    return { ok: false, error: 'Add at most 12 expertise labels.' };
  }
  const expertise = normalizeExpertiseList(expertiseInput);

  let socialsInput: unknown = [];
  if (Array.isArray(input.socials)) {
    socialsInput = input.socials;
  } else if (input.socialsJson) {
    const parsed = parseJsonObject(input.socialsJson);
    if (!parsed) return { ok: false, error: 'Social links are invalid.' };
    socialsInput = Object.entries(parsed).map(([platform, url]) => ({ platform, url }));
  }
  const { links, errors } = validateSocialLinks(socialsInput);
  if (errors.length) return { ok: false, error: errors[0] };

  return {
    ok: true,
    value: {
      name,
      slug: rawSlug || undefined,
      email,
      role,
      shortBio,
      extendedBio,
      profileImage,
      website,
      expertiseJson: serializeExpertise(expertise),
      socialsJson: serializeSocials(links),
      published: input.published,
    },
  };
}

export function autoSlugFor(name: string) {
  return slugifyAuthorName(name) || 'author';
}

/**
 * Reserves a slug that is not used by a current author or by an old-slug
 * redirect owned by a different profile. `undefined` means the slug is free.
 */
export async function findSlugConflict(
  prisma: Pick<PrismaClient, 'blogAuthor' | 'authorSlugRedirect'>,
  slug: string,
  authorId?: string,
) {
  const current = await prisma.blogAuthor.findUnique({ where: { slug }, select: { id: true } });
  if (current && current.id !== authorId) return 'A profile already uses this slug.';
  const redirect = await prisma.authorSlugRedirect.findUnique({
    where: { oldSlug: slug },
    select: { authorId: true },
  });
  if (redirect && redirect.authorId !== authorId) return 'This slug is reserved by a previous author URL. Choose another.';
  return null;
}

export async function uniqueAutoSlug(
  prisma: Pick<PrismaClient, 'blogAuthor' | 'authorSlugRedirect'>,
  base: string,
) {
  let candidate = base;
  for (let suffix = 2; suffix < 500; suffix += 1) {
    const reason = await findSlugConflict(prisma, candidate);
    if (!reason) return candidate;
    candidate = `${base}-${suffix}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type AdminAuthorRecord = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  role: string;
  profileImage: string | null;
  shortBio: string | null;
  extendedBio: string | null;
  expertiseJson: string;
  website: string | null;
  socialsJson: string;
  published: boolean;
  isSample: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminAuthorPayload = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  role: string;
  profileImage: string | null;
  shortBio: string | null;
  extendedBio: string | null;
  expertise: string[];
  website: string | null;
  socials: AuthorSocialLink[];
  published: boolean;
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
  postCount: number;
  publishedPostCount: number;
};

export function serializeAdminAuthor(
  record: AdminAuthorRecord,
  counts: { postCount?: number; publishedPostCount?: number } = {},
): AdminAuthorPayload {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    email: record.email,
    role: record.role,
    profileImage: record.profileImage,
    shortBio: record.shortBio,
    extendedBio: record.extendedBio,
    expertise: parseExpertise(record.expertiseJson),
    website: record.website ? normalizeHttpUrl(record.website) : null,
    socials: parseSocials(record.socialsJson),
    published: record.published,
    isSample: record.isSample,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    postCount: counts.postCount ?? 0,
    publishedPostCount: counts.publishedPostCount ?? 0,
  };
}
