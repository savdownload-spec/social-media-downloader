import { generateHTML } from '@tiptap/html';
import sanitizeHtml from 'sanitize-html';
import { getBaseExtensions } from './tiptapExtensions';
import { analyzeContentJson, type TiptapNode } from './contentText';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr',
  'strong', 'em', 'u', 's', 'code', 'pre',
  'ul', 'ol', 'li', 'blockquote',
  'a', 'figure', 'figcaption', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'iframe',
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'loading'],
    div: ['data-callout', 'data-variant'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    code: ['class'],
    h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'],
  },
  allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com'],
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, false),
  },
};

/**
 * Renders a Tiptap JSON document to sanitized HTML for the public site.
 * Only called for posts saved with the new editor (post.contentJson set) —
 * posts without it keep using the legacy hand-rolled markdown renderer.
 */
export function renderContentJsonToHtml(doc: TiptapNode | null | undefined): string {
  if (!doc) return '';
  try {
    const html = generateHTML(doc as Record<string, unknown>, getBaseExtensions());
    const headings = analyzeContentJson(doc).headings;
    let index = 0;
    // generateHTML() doesn't add heading ids; inject them in document order —
    // analyzeContentJson() walks the same doc in the same order, so the Nth
    // heading tag here is always the Nth entry in `headings`.
    const withIds = html.replace(/<h([1-4])>/g, (match, level: string) => {
      const heading = headings[index++];
      return heading ? `<h${level} id="${heading.id}">` : match;
    });
    return sanitizeHtml(withIds, SANITIZE_OPTIONS);
  } catch {
    return '';
  }
}
