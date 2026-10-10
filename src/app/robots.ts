import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

const PRIVATE_PATHS = [
  '/admin',
  '/admin/',
  '/workspace',
  '/workspace/',
  '/account',
  '/account/',
  '/billing',
  '/api/',
  '/auth/',
  '/_next/',
  '/cdn-cgi/',
];

const publicRule = (userAgent: string) => ({
  userAgent,
  allow: '/',
  disallow: PRIVATE_PATHS,
});

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Wildcard baseline — must come first so specific rules below can
      // override for crawlers that read top-to-bottom.
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      // OpenAI: training crawler
      publicRule('GPTBot'),
      // OpenAI: ChatGPT Search discovery crawler
      publicRule('OAI-SearchBot'),
      // OpenAI: ChatGPT browsing plugin
      publicRule('ChatGPT-User'),
      // Google: main web crawler
      publicRule('Googlebot'),
      // Google: AI training / Gemini
      publicRule('Google-Extended'),
      // Microsoft: Bing crawler
      publicRule('Bingbot'),
      // Microsoft: link preview / Copilot
      publicRule('MicrosoftPreview'),
      // Anthropic: Claude
      publicRule('ClaudeBot'),
      // Perplexity AI
      publicRule('PerplexityBot'),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
