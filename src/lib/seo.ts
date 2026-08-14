import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

type SeoInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
};

function absoluteUrl(value: string) {
  return value.startsWith('http') ? value : `${siteConfig.url}${value}`;
}

export function buildMetadata({
  title,
  description,
  path = '/',
  image,
  keywords = [],
  noIndex = false,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
}: SeoInput): Metadata {
  const url = absoluteUrl(path);
  const ogImage = absoluteUrl(image ?? '/og-default.svg');
  const authors = author ? [{ name: author }] : [{ name: siteConfig.name }];

  return {
    title,
    description,
    keywords: keywords.length ? keywords : [...siteConfig.keywords],
    metadataBase: new URL(siteConfig.url),
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: siteConfig.name,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(type === 'article' ? { publishedTime, modifiedTime, authors: authors.map((entry) => entry.name) } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      creator: siteConfig.twitterHandle,
    },
    authors,
  };
}

export function jsonLd(data: Record<string, unknown>) {
  return {
    __html: JSON.stringify({ '@context': 'https://schema.org', ...data }),
  };
}

export function softwareAppSchema(tool: { name: string; description: string; url: string }) {
  return {
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.description,
    url: tool.url,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

export function faqSchema(items: ReadonlyArray<{ question: string; answer: string }>) {
  const entities = [];
  for (const item of items || []) {
    entities.push({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    });
  }
  return {
    '@type': 'FAQPage',
    mainEntity: entities,
  };
}

export function breadcrumbSchema(crumbs: ReadonlyArray<{ name: string; url: string }>) {
  const items = [];
  for (let i = 0; i < (crumbs || []).length; i++) {
    items.push({
      '@type': 'ListItem',
      position: i + 1,
      name: crumbs[i].name,
      item: crumbs[i].url,
    });
  }
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}
