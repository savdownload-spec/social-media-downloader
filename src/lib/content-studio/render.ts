import { generateHTML } from '@tiptap/html';
import sanitizeHtml from 'sanitize-html';
import { getBaseExtensions } from './tiptapExtensions';
import { analyzeContentJson, type TiptapNode } from './contentText';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
  'strong', 'em', 'u', 's', 'code', 'pre', 'sup', 'sub',
  'ul', 'ol', 'li', 'blockquote',
  'a', 'figure', 'figcaption', 'img',
  'table', 'colgroup', 'col', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'iframe',
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'loading'],
    div: ['class', 'data-callout', 'data-variant'],
    figure: ['data-figure-image', 'data-align'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title'],
    table: ['style'],
    col: ['style'],
    th: ['colspan', 'rowspan', 'colwidth', 'style'],
    td: ['colspan', 'rowspan', 'colwidth', 'style'],
    ol: ['start'],
    code: ['class'],
    p: ['style'],
    li: ['style'],
    h1: ['id', 'style'], h2: ['id', 'style'], h3: ['id', 'style'],
    h4: ['id', 'style'], h5: ['id', 'style'], h6: ['id', 'style'],
  },
  // TextAlign stores alignment as an inline style — allow exactly that one
  // property and nothing else, so pasted/legacy styles can't leak through.
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
    },
    table: { width: [/^\d+(?:\.\d+)?px$/], 'min-width': [/^\d+(?:\.\d+)?px$/] },
    col: { width: [/^\d+(?:\.\d+)?px$/], 'min-width': [/^\d+(?:\.\d+)?px$/] },
  },
  allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com'],
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    // Legacy editor documents may contain h1 nodes. The article page already
    // renders its title as h1, so preserve the text while normalizing the
    // nested content to the next valid level.
    h1: (tagName, attribs) => ({ tagName: 'h2', attribs }),
    a: (tagName, attribs) => {
      // Links opening in a new tab must never expose window.opener; keep any
      // stored rel tokens (nofollow etc.) rather than overwriting them.
      const tokens = new Set((attribs.rel || '').split(/\s+/).filter(Boolean));
      tokens.add('noopener');
      if (attribs.target === '_blank') tokens.add('noreferrer');
      return { tagName: 'a', attribs: { ...attribs, rel: Array.from(tokens).join(' ') } };
    },
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
    const withIds = html.replace(/<h([1-6])(\s[^>]*)?>/g, (match, level: string, attributes = '') => {
      const heading = headings[index++];
      return heading ? `<h${level}${attributes} id="${heading.id}">` : match;
    });
    return sanitizeHtml(withIds, SANITIZE_OPTIONS);
  } catch {
    return '';
  }
}
