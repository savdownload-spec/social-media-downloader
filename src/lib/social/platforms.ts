/**
 * Platform capability registry for the Social Media Manager.
 *
 * `automatedPhase` records when real API publishing becomes available:
 *   1 = manual workflow only (this phase), 2 = free OAuth integration,
 *   3 = gated by an external review/verification, null = manual permanently.
 * The UI and worker read these flags so an unavailable integration is never
 * presented as working automation.
 */

export const PLATFORM_IDS = [
  'FACEBOOK',
  'INSTAGRAM',
  'LINKEDIN',
  'LINKEDIN_PAGE',
  'PINTEREST',
  'X',
  'YOUTUBE',
  'REDDIT',
  'MEDIUM',
  'QUORA',
  'BLUESKY',
  'MASTODON',
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export type PlatformGroup = 'Meta' | 'Professional' | 'Discovery' | 'Video' | 'Community' | 'Open web';

export type MediaRule = {
  images: { min: number; max: number; mimeTypes: string[] };
  video: { max: number; mimeTypes: string[]; maxBytes: number } | null;
  requiresMedia: boolean;
};

export type PlatformDefinition = {
  id: PlatformId;
  label: string;
  short: string;
  group: PlatformGroup;
  /** Brand colour used by the platform mark. */
  color: string;
  /** 1–3 character mark; avoids shipping a large brand-icon dependency. */
  mark: string;
  /** Whether the official API can publish automatically at all. */
  autoPublish: boolean;
  /** Whether the assisted (copy/export/open-composer) workflow is offered. */
  manualFallback: boolean;
  /** Phase in which automation is enabled; null = never automated. */
  automatedPhase: 2 | 3 | null;
  accountType: string;
  captionLimit: number | null;
  titleRequired?: boolean;
  titleLimit?: number;
  /** Options that must be supplied from a connected account before publishing. */
  accountOptions?: ('board' | 'subreddit' | 'visibility')[];
  media: MediaRule;
  connection: 'oauth' | 'manual' | 'app-password';
  /** Shown in the accounts page so limitations are explicit. */
  providerNotes: string;
  manualComposerUrl: string | null;
};

const JPEG = ['image/jpeg'];
const COMMON_IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
const COMMON_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm'];
const VIDEO_200MB = { max: 1, mimeTypes: COMMON_VIDEO, maxBytes: 200 * 1024 * 1024 };

const DEFINITIONS: Record<PlatformId, PlatformDefinition> = {
  FACEBOOK: {
    id: 'FACEBOOK',
    label: 'Facebook Pages',
    short: 'Facebook',
    group: 'Meta',
    color: '#1877F2',
    mark: 'f',
    autoPublish: true,
    manualFallback: true,
    automatedPhase: 2,
    accountType: 'Page',
    captionLimit: 63206,
    media: {
      images: { min: 0, max: 10, mimeTypes: COMMON_IMAGES },
      video: VIDEO_200MB,
      requiresMedia: false,
    },
    connection: 'oauth',
    providerNotes: 'Pages only — personal profiles cannot be published to through the API.',
    manualComposerUrl: 'https://www.facebook.com/',
  },
  INSTAGRAM: {
    id: 'INSTAGRAM',
    label: 'Instagram',
    short: 'Instagram',
    group: 'Meta',
    color: '#E1306C',
    mark: 'IG',
    autoPublish: true,
    manualFallback: true,
    automatedPhase: 2,
    accountType: 'Professional (Business/Creator)',
    captionLimit: 2200,
    media: {
      images: { min: 1, max: 20, mimeTypes: JPEG },
      video: VIDEO_200MB,
      requiresMedia: true,
    },
    connection: 'oauth',
    providerNotes:
      'Professional accounts only. Images must be JPEG and hosted on a public URL; 100 API posts per 24 hours.',
    manualComposerUrl: 'https://www.instagram.com/',
  },
  LINKEDIN: {
    id: 'LINKEDIN',
    label: 'LinkedIn (Personal)',
    short: 'LinkedIn',
    group: 'Professional',
    color: '#0A66C2',
    mark: 'in',
    autoPublish: true,
    manualFallback: true,
    automatedPhase: 2,
    accountType: 'Member profile',
    captionLimit: 3000,
    media: {
      images: { min: 0, max: 20, mimeTypes: COMMON_IMAGES },
      video: VIDEO_200MB,
      requiresMedia: false,
    },
    connection: 'oauth',
    providerNotes: 'Self-serve "Share on LinkedIn" access. Access tokens last about 60 days, then reconnect.',
    manualComposerUrl: 'https://www.linkedin.com/feed/?shareActive=true',
  },
  LINKEDIN_PAGE: {
    id: 'LINKEDIN_PAGE',
    label: 'LinkedIn (Company Page)',
    short: 'Company Page',
    group: 'Professional',
    color: '#004182',
    mark: 'in',
    autoPublish: true,
    manualFallback: true,
    automatedPhase: 3,
    accountType: 'Company Page (admin)',
    captionLimit: 3000,
    media: {
      images: { min: 0, max: 20, mimeTypes: COMMON_IMAGES },
      video: VIDEO_200MB,
      requiresMedia: false,
    },
    connection: 'oauth',
    providerNotes: 'Requires LinkedIn Community Management API approval before publishing is enabled.',
    manualComposerUrl: 'https://www.linkedin.com/feed/?shareActive=true',
  },
  PINTEREST: {
    id: 'PINTEREST',
    label: 'Pinterest',
    short: 'Pinterest',
    group: 'Discovery',
    color: '#E60023',
    mark: 'P',
    autoPublish: true,
    manualFallback: true,
    automatedPhase: 3,
    accountType: 'Business account',
    captionLimit: 800,
    titleRequired: true,
    titleLimit: 100,
    accountOptions: ['board'],
    media: {
      images: { min: 1, max: 1, mimeTypes: COMMON_IMAGES },
      video: VIDEO_200MB,
      requiresMedia: true,
    },
    connection: 'oauth',
    providerNotes: 'A destination board is required. Standard access review is needed for public Pins.',
    manualComposerUrl: 'https://www.pinterest.com/',
  },
  X: {
    id: 'X',
    label: 'X (Twitter)',
    short: 'X',
    group: 'Community',
    color: '#111827',
    mark: 'X',
    autoPublish: false,
    manualFallback: true,
    automatedPhase: null,
    accountType: 'Account',
    captionLimit: 280,
    media: {
      images: { min: 0, max: 4, mimeTypes: COMMON_IMAGES },
      video: VIDEO_200MB,
      requiresMedia: false,
    },
    connection: 'manual',
    providerNotes:
      'The free posting API was closed to new developers. Publishing stays manual unless you approve paid access.',
    manualComposerUrl: 'https://twitter.com/intent/tweet',
  },
  YOUTUBE: {
    id: 'YOUTUBE',
    label: 'YouTube',
    short: 'YouTube',
    group: 'Video',
    color: '#FF0000',
    mark: '▶',
    autoPublish: true,
    manualFallback: true,
    automatedPhase: 3,
    accountType: 'Channel',
    captionLimit: 5000,
    titleRequired: true,
    titleLimit: 100,
    accountOptions: ['visibility'],
    media: {
      images: { min: 0, max: 0, mimeTypes: [] },
      video: VIDEO_200MB,
      requiresMedia: true,
    },
    connection: 'oauth',
    providerNotes: 'Video is required. Uploads use the Data API quota and OAuth verification for non-test users.',
    manualComposerUrl: 'https://studio.youtube.com/',
  },
  REDDIT: {
    id: 'REDDIT',
    label: 'Reddit',
    short: 'Reddit',
    group: 'Community',
    color: '#FF4500',
    mark: 'r',
    autoPublish: false,
    manualFallback: true,
    automatedPhase: null,
    accountType: 'Account',
    captionLimit: 40000,
    titleRequired: true,
    titleLimit: 300,
    accountOptions: ['subreddit'],
    media: {
      images: { min: 0, max: 1, mimeTypes: COMMON_IMAGES },
      video: VIDEO_200MB,
      requiresMedia: false,
    },
    connection: 'manual',
    providerNotes:
      'The free Data API is limited to approved non-commercial use. A commercial site needs Reddit’s agreement.',
    manualComposerUrl: 'https://www.reddit.com/submit',
  },
  MEDIUM: {
    id: 'MEDIUM',
    label: 'Medium',
    short: 'Medium',
    group: 'Open web',
    color: '#111827',
    mark: 'M',
    autoPublish: false,
    manualFallback: true,
    automatedPhase: null,
    accountType: 'Account',
    captionLimit: 100000,
    media: {
      images: { min: 0, max: 0, mimeTypes: [] },
      video: null,
      requiresMedia: false,
    },
    connection: 'manual',
    providerNotes: 'Medium issues no new API integrations. Articles are prepared with Markdown export.',
    manualComposerUrl: 'https://medium.com/new-story',
  },
  QUORA: {
    id: 'QUORA',
    label: 'Quora',
    short: 'Quora',
    group: 'Open web',
    color: '#B92B27',
    mark: 'Q',
    autoPublish: false,
    manualFallback: true,
    automatedPhase: null,
    accountType: 'Account',
    captionLimit: 100000,
    media: {
      images: { min: 0, max: 0, mimeTypes: [] },
      video: null,
      requiresMedia: false,
    },
    connection: 'manual',
    providerNotes: 'No public publishing API. Answers are drafted, copied, and confirmed manually.',
    manualComposerUrl: 'https://www.quora.com/',
  },
  BLUESKY: {
    id: 'BLUESKY',
    label: 'Bluesky',
    short: 'Bluesky',
    group: 'Community',
    color: '#0085FF',
    mark: 'BS',
    autoPublish: true,
    manualFallback: true,
    automatedPhase: 2,
    accountType: 'Account',
    captionLimit: 300,
    media: {
      images: { min: 0, max: 4, mimeTypes: COMMON_IMAGES },
      video: VIDEO_200MB,
      requiresMedia: false,
    },
    connection: 'app-password',
    providerNotes: 'AT Protocol with an app password. Free, no review required.',
    manualComposerUrl: 'https://bsky.app/',
  },
  MASTODON: {
    id: 'MASTODON',
    label: 'Mastodon',
    short: 'Mastodon',
    group: 'Community',
    color: '#6364FF',
    mark: 'MA',
    autoPublish: true,
    manualFallback: true,
    automatedPhase: 2,
    accountType: 'Account (per instance)',
    captionLimit: 500,
    media: {
      images: { min: 0, max: 4, mimeTypes: COMMON_IMAGES },
      video: VIDEO_200MB,
      requiresMedia: false,
    },
    connection: 'oauth',
    providerNotes: 'Free OAuth per instance. Character limit depends on the instance (500 default).',
    manualComposerUrl: 'https://mastodon.social/',
  },
};

export const PLATFORMS: PlatformDefinition[] = PLATFORM_IDS.map((id) => DEFINITIONS[id]);

export function getPlatform(id: string): PlatformDefinition | null {
  return (DEFINITIONS as Record<string, PlatformDefinition | undefined>)[id] ?? null;
}

export function isPlatformId(value: string): value is PlatformId {
  return (PLATFORM_IDS as readonly string[]).includes(value);
}

/** Platforms whose automation is enabled in the current phase (1). */
export function platformsAutomatedNow(): PlatformDefinition[] {
  return PLATFORMS.filter((p) => p.automatedPhase !== null && p.automatedPhase <= 1);
}

export function manualComposerHref(
  platform: PlatformId,
  input: { text: string; title?: string | null; url?: string | null },
): string {
  const def = DEFINITIONS[platform];
  const base = def.manualComposerUrl ?? 'https://www.google.com/';
  try {
    if (platform === 'X') {
      const params = new URLSearchParams({ text: input.text.slice(0, 280) });
      return `${base}?${params.toString()}`;
    }
    if (platform === 'REDDIT') {
      const params = new URLSearchParams({
        title: (input.title ?? input.text.split('\n')[0] ?? '').slice(0, 300),
        text: input.text,
      });
      if (input.url) params.set('url', input.url);
      return `${base}?${params.toString()}`;
    }
  } catch {
    return base;
  }
  return base;
}
