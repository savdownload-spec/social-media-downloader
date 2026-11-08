import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

type SeoInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  noFollow?: boolean;
  author?: string;
};

export function canonicalUrl(value: string) {
  const url = new URL(value, `${siteConfig.url}/`);
  if (['savdown.com', 'www.savdown.com', 'www.getsavdown.com', 'getsavdown.com'].includes(url.hostname)) {
    url.protocol = 'https:';
    url.host = new URL(siteConfig.url).host;
  }
  return url.toString();
}

export function buildMetadata({
  title,
  description,
  path = '/',
  keywords = [],
  noIndex = false,
  noFollow = false,
  author,
}: SeoInput): Metadata {
  const url = canonicalUrl(path);
  const ogImage = `${siteConfig.url}${siteConfig.ogImage}`;
  const socialTitle = title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`;
  const authors = author ? [{ name: author }] : [{ name: siteConfig.name }];

  return {
    title,
    description,
    keywords: keywords.length ? keywords : [...siteConfig.keywords],
    metadataBase: new URL(siteConfig.url),
    alternates: { canonical: url },
    // Preserves the original noIndex-implies-nofollow behavior for every
    // existing caller (none of which pass noFollow); an explicit noFollow
    // can additionally nofollow an otherwise-indexable page.
    robots: { index: !noIndex, follow: noFollow ? false : !noIndex },
    openGraph: {
      type: 'website',
      url,
      title: socialTitle,
      description,
      siteName: siteConfig.name,
      locale: 'en_US',
      images: [{
        url: ogImage,
        secureUrl: ogImage,
        type: 'image/jpeg',
        width: siteConfig.ogImageWidth,
        height: siteConfig.ogImageHeight,
        alt: siteConfig.ogImageAlt,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [{ url: ogImage, alt: siteConfig.ogImageAlt }],
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

export function organizationSchema() {
  return {
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon-512.png`,
    description: siteConfig.description,
    sameAs: siteConfig.social.map((s) => s.href),
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function howToSchema(name: string, steps: ReadonlyArray<{ title: string; body: string }>) {
  return {
    '@type': 'HowTo',
    name,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
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
