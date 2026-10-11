import { describe, expect, it } from 'vitest';
import { catalog } from '@/config/catalog';
import {
  buildKnowledgeCorpus,
  hasSufficientEvidence,
  resolveEntity,
  searchKnowledge,
} from '@/lib/support-knowledge';
import { detectCategory, detectIntent } from '@/lib/support-nlp';

describe('SavDown-wide Support AI routing', () => {
  const cases: Array<[string, string, string]> = [
    ['How do I download a YouTube video?', 'youtube-video-downloader', 'downloaders'],
    ['How do I remove an image background?', 'background-remover', 'image'],
    ['How do I convert a video?', 'video-converter', 'video'],
    ['How do I merge PDFs?', 'merge-pdf', 'pdf'],
    ['How do I generate an AI image?', 'ai-image-generator', 'ai'],
    ['How do I improve SEO?', 'seo', 'seo'],
    ['How do SavCredits work?', 'credits', 'credits'],
    ['How do I sign in with Google?', 'auth', 'account'],
    ['Where are my previous downloads?', 'downloads', 'workspace'],
    ['How do I create a collection?', 'collections', 'workspace'],
  ];

  it.each(cases)('routes "%s" to %s', (query, entityId, category) => {
    const resolved = resolveEntity(query);
    expect(resolved?.entity.id).toBe(entityId);
    expect(resolved?.entity.category).toBe(category);
  });

  it('keeps entity retrieval generic and rejects unrelated tool evidence', () => {
    const resolved = resolveEntity('How do I download a YouTube video?');
    expect(resolved?.entity.id).toBe('youtube-video-downloader');
    const docs = searchKnowledge('How do I download a YouTube video?', {
      entity: resolved,
      category: 'downloaders',
      intent: 'how_to',
      corpus: buildKnowledgeCorpus(),
      topK: 8,
    });

    expect(hasSufficientEvidence(docs, resolved)).toBe(true);
    expect(docs.some((doc) => doc.toolSlug === 'merge-pdf')).toBe(false);
    expect(docs.some((doc) => doc.category === 'pricing')).toBe(false);
    expect(docs.some((doc) => doc.toolSlug === 'youtube-video-downloader')).toBe(true);
  });

  it('derives coverage from the live catalog rather than a route-specific list', () => {
    const corpus = buildKnowledgeCorpus();
    for (const tool of catalog) {
      expect(corpus.some((doc) => doc.id === `tool-${tool.slug}`)).toBe(true);
    }
  });

  it('detects intent before generic how-to fallback', () => {
    expect(detectIntent('Why did my payment fail?')).toBe('billing');
    expect(detectIntent('How many files can I upload?')).toBe('limits');
    expect(detectIntent('What formats does it support?')).toBe('supported_formats');
    expect(detectCategory('How do I convert a video?').category).toBe('video');
  });
});
