/**
 * Pure author-profile helpers shared by server routes and client components.
 * Keep this module free of Prisma/Node-only imports so the admin form can use
 * the exact same validation as the API.
 */

export const AUTHOR_SOCIAL_PLATFORMS = [
  'linkedin',
  'x',
  'facebook',
  'instagram',
  'youtube',
  'github',
] as const;

export type AuthorSocialPlatform = (typeof AUTHOR_SOCIAL_PLATFORMS)[number];

export type AuthorSocialLink = {
  platform: AuthorSocialPlatform;
  url: string;
};

export const AUTHOR_SOCIAL_META: Record<
  AuthorSocialPlatform,
  { label: string; placeholder: string }
> = {
  linkedin: { label: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/username' },
  x: { label: 'X (Twitter)', placeholder: 'https://x.com/username' },
  facebook: { label: 'Facebook', placeholder: 'https://www.facebook.com/username' },
  instagram: { label: 'Instagram', placeholder: 'https://www.instagram.com/username' },
  youtube: { label: 'YouTube', placeholder: 'https://www.youtube.com/@channel' },
  github: { label: 'GitHub', placeholder: 'https://github.com/username' },
};

export const AUTHOR_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MAX_SOCIAL_LINKS = 6;
export const MAX_EXPERTISE_ITEMS = 12;
const MAX_URL_LENGTH = 2048;
const MAX_EXPERTISE_LENGTH = 60;

/* ── URLs ─────────────────────────────────────────────────────────────── */

/**
 * Rejects non-HTTP schemes and malformed hosts. A bare domain is upgraded to
 * https so an admin can paste `linkedin.com/in/name` without fighting the form.
 */
export function normalizeHttpUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw || raw.length > MAX_URL_LENGTH) return null;
  if (raw.startsWith('//')) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!parsed.hostname || parsed.hostname.includes(' ')) return null;
  if (parsed.username || parsed.password) return null;
  return parsed.toString();
}

export function isSafeHttpUrl(value: string): boolean {
  return normalizeHttpUrl(value) !== null;
}

/* ── Social links ─────────────────────────────────────────────────────── */

function normalizePlatform(raw: string): AuthorSocialPlatform | null {
  const key = raw.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (key === 'twitter' || key === 'x-twitter' || key === 'x') return 'x';
  if ((AUTHOR_SOCIAL_PLATFORMS as readonly string[]).includes(key)) {
    return key as AuthorSocialPlatform;
  }
  // Personal websites are stored in the dedicated `website` column.
  return null;
}

/** Parses the stored platform map into safe, de-duplicated links. */
export function parseSocials(json: string | null | undefined): AuthorSocialLink[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

  const seen = new Set<AuthorSocialPlatform>();
  const links: AuthorSocialLink[] = [];
  for (const [rawPlatform, rawUrl] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof rawUrl !== 'string') continue;
    const platform = normalizePlatform(rawPlatform);
    if (!platform || seen.has(platform)) continue;
    const url = normalizeHttpUrl(rawUrl);
    if (!url) continue;
    seen.add(platform);
    links.push({ platform, url });
  }
  return links.sort(
    (a, b) => AUTHOR_SOCIAL_PLATFORMS.indexOf(a.platform) - AUTHOR_SOCIAL_PLATFORMS.indexOf(b.platform),
  );
}

/**
 * Validates admin-submitted links. Returns `{ links, errors }` rather than
 * throwing so the API can surface field-level messages.
 */
export function validateSocialLinks(input: unknown): {
  links: AuthorSocialLink[];
  errors: string[];
} {
  const errors: string[] = [];
  if (input === undefined || input === null) return { links: [], errors };
  if (!Array.isArray(input)) return { links: [], errors: ['Social links must be a list.'] };
  if (input.length > MAX_SOCIAL_LINKS) {
    errors.push(`Add at most ${MAX_SOCIAL_LINKS} social links.`);
  }

  const seen = new Set<AuthorSocialPlatform>();
  const links: AuthorSocialLink[] = [];
  input.slice(0, MAX_SOCIAL_LINKS).forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Social link ${index + 1} is invalid.`);
      return;
    }
    const { platform, url } = item as { platform?: unknown; url?: unknown };
    if (typeof platform !== 'string' || !(AUTHOR_SOCIAL_PLATFORMS as readonly string[]).includes(platform)) {
      errors.push(`Social link ${index + 1} has an unsupported platform.`);
      return;
    }
    const typedPlatform = platform as AuthorSocialPlatform;
    if (seen.has(typedPlatform)) {
      errors.push(`${AUTHOR_SOCIAL_META[typedPlatform].label} can only be added once.`);
      return;
    }
    if (typeof url !== 'string') {
      errors.push(`Social link ${index + 1} needs a URL.`);
      return;
    }
    const normalized = normalizeHttpUrl(url);
    if (!normalized) {
      errors.push(`${AUTHOR_SOCIAL_META[typedPlatform].label} needs a valid http(s) URL.`);
      return;
    }
    seen.add(typedPlatform);
    links.push({ platform: typedPlatform, url: normalized });
  });

  return { links, errors };
}

export function serializeSocials(links: AuthorSocialLink[]): string {
  const map: Partial<Record<AuthorSocialPlatform, string>> = {};
  for (const link of links) {
    const url = normalizeHttpUrl(link.url);
    if (url) map[link.platform] = url;
  }
  return JSON.stringify(map);
}

/* ── Expertise ────────────────────────────────────────────────────────── */

function cleanExpertise(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_EXPERTISE_LENGTH);
}

export function parseExpertise(json: string | null | undefined): string[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return normalizeExpertiseList(parsed);
}

export function normalizeExpertiseList(input: unknown[]): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const value of input) {
    const cleaned = cleanExpertise(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(cleaned);
    if (items.length >= MAX_EXPERTISE_ITEMS) break;
  }
  return items;
}

export function serializeExpertise(items: string[]): string {
  return JSON.stringify(normalizeExpertiseList(items));
}

/* ── Slugs ────────────────────────────────────────────────────────────── */

export function slugifyAuthorName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function authorInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/* ── Public shapes ────────────────────────────────────────────────────── */

export type PublicAuthor = {
  id: string;
  name: string;
  slug: string;
  role: string;
  profileImage: string | null;
  shortBio: string | null;
  extendedBio: string | null;
  expertise: string[];
  website: string | null;
  socials: AuthorSocialLink[];
  articleCount: number;
  isSample: boolean;
  updatedAt: string;
};

export type BlogAuthorSummary = {
  id: string;
  name: string;
  slug: string;
  profileImage: string | null;
  role: string;
  shortBio: string | null;
  socialsJson: string;
  published: boolean;
  isSample: boolean;
};
