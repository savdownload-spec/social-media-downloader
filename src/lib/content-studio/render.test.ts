import { describe, expect, it } from 'vitest';
import { renderContentJsonToHtml } from './render';
import type { TiptapNode } from './contentText';

const doc = (content: TiptapNode[]): TiptapNode => ({ type: 'doc', content });

const p = (text: string, attrs?: Record<string, unknown>, marks?: TiptapNode['marks']): TiptapNode => ({
  type: 'paragraph', attrs, ...(marks ? { content: [{ type: 'text', text, marks }] } : { content: [{ type: 'text', text }] }),
});

describe('renderContentJsonToHtml', () => {
  it('renders all six heading levels semantically with ids', () => {
    const html = renderContentJsonToHtml(doc(
      [1, 2, 3, 4, 5, 6].map((level) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text: `Title ${level}` }] })),
    ));
    for (const level of [1, 2, 3, 4, 5, 6]) {
      expect(html).toContain(`<h${level} id="title-${level}">Title ${level}</h${level}>`);
    }
  });

  it('keeps link href, target and nofollow rel through sanitization', () => {
    const html = renderContentJsonToHtml(doc([
      p('click', undefined, [{ type: 'link', attrs: { href: 'https://example.com', target: '_blank', rel: 'noopener noreferrer nofollow' } }]),
      p('internal', undefined, [{ type: 'link', attrs: { href: '/tools/youtube-downloader', rel: 'noopener noreferrer' } }]),
    ]));
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('nofollow');
    expect(html).toContain('href="/tools/youtube-downloader"');
  });

  it('always adds noopener to links', () => {
    const html = renderContentJsonToHtml(doc([
      p('x', undefined, [{ type: 'link', attrs: { href: 'https://example.com' } }]),
    ]));
    expect(html).toMatch(/rel="[^"]*noopener/);
  });

  it('drops script-style hrefs', () => {
    const html = renderContentJsonToHtml(doc([
      p('x', undefined, [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]),
    ]));
    expect(html).not.toContain('javascript:');
  });

  it('preserves text-align style only', () => {
    const html = renderContentJsonToHtml(doc([
      { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'centered' }] },
    ]));
    expect(html).toContain('text-align:center');
    expect(html).not.toContain('color:');
  });

  it('renders figure images with alt, alignment and link', () => {
    const html = renderContentJsonToHtml(doc([
      {
        type: 'figureImage',
        attrs: {
          src: '/images/blog/x.webp', alt: 'A chart', caption: 'Fig. 1',
          align: 'center', href: 'https://example.com',
        },
      },
    ]));
    expect(html).toContain('data-figure-image');
    expect(html).toContain('data-align="center"');
    expect(html).toContain('alt="A chart"');
    expect(html).toContain('<figcaption>Fig. 1</figcaption>');
    expect(html).toMatch(/<a href="https:\/\/example\.com"[^>]*><img/);
  });

  it('renders tables inside a scrollable wrapper with header cells', () => {
    const html = renderContentJsonToHtml(doc([
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [p('H1')] },
              { type: 'tableHeader', content: [p('H2')] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [p('A')] },
              { type: 'tableCell', content: [p('B')] },
            ],
          },
        ],
      },
    ]));
    expect(html).toContain('tableWrapper');
    expect(html).toContain('<th');
    expect(html).toContain('<td');
  });

  it('renders sub/sup, code block, blockquote and horizontal rule', () => {
    const html = renderContentJsonToHtml(doc([
      { type: 'paragraph', content: [{ type: 'text', text: '2', marks: [{ type: 'superscript' }] }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'n', marks: [{ type: 'subscript' }] }] },
      { type: 'codeBlock', content: [{ type: 'text', text: 'const a = 1;' }] },
      { type: 'blockquote', content: [p('quoted')] },
      { type: 'horizontalRule' },
    ]));
    expect(html).toContain('<sup>');
    expect(html).toContain('<sub>');
    expect(html).toContain('<pre>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<hr');
  });

  it('renders callouts with their variant', () => {
    const html = renderContentJsonToHtml(doc([
      { type: 'callout', attrs: { variant: 'warning' }, content: [p('careful')] },
    ]));
    expect(html).toContain('data-callout');
    expect(html).toContain('data-variant="warning"');
  });
});
