import type { TiptapNode } from '@/lib/content-studio/contentText';

export type FaqBlock = { question: string; answer: string };
export type HowToBlock = { title: string; description: string; image?: string };

export type StudioForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentJson: TiptapNode | null;
  author: string;
  tagsJson: string;
  category: string;
  coverImage: string;
  coverAlt: string;
  ogImage: string;
  primaryKeyword: string;
  secondaryKeywordsJson: string;
  canonicalUrl: string;
  toolSlug: string;
  readingTimeMinutes: string;
  published: boolean;
  seoTitle: string;
  metaDescription: string;
  focusKeyphrase: string;
  synonymsJson: string;
  noIndex: boolean;
  noFollow: boolean;
  metaRobotsAdvanced: string;
  breadcrumbTitle: string;
  schemaType: string;
  faqJson: string;
  howToJson: string;
  ogTitle: string;
  ogDescription: string;
  scheduledAt: string;
};

export const EMPTY_STUDIO_FORM: StudioForm = {
  title: '', slug: '', excerpt: '', content: '', contentJson: null,
  author: 'Editorial Team', tagsJson: '[]', category: 'Guides',
  coverImage: '', coverAlt: '', ogImage: '',
  primaryKeyword: '', secondaryKeywordsJson: '[]',
  canonicalUrl: '', toolSlug: '', readingTimeMinutes: '',
  published: false,
  seoTitle: '', metaDescription: '', focusKeyphrase: '', synonymsJson: '[]',
  noIndex: false, noFollow: false, metaRobotsAdvanced: '', breadcrumbTitle: '',
  schemaType: 'BlogPosting', faqJson: '[]', howToJson: '[]',
  ogTitle: '', ogDescription: '', scheduledAt: '',
};

export function parseArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json || '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function parseFaq(json: string): FaqBlock[] {
  try {
    const parsed = JSON.parse(json || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseHowTo(json: string): HowToBlock[] {
  try {
    const parsed = JSON.parse(json || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
