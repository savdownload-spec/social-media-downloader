/**
 * Pure, DOM-free walkers over a Tiptap/ProseMirror JSON document. Used both
 * client-side (live editor stats) and server-side (SEO/readability scoring
 * on save), so the numbers shown while writing match what gets persisted.
 */

export type TiptapNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type HeadingInfo = { id: string; level: number; text: string };
export type ImageInfo = { src: string; alt: string; hasAlt: boolean };
export type LinkInfo = { href: string; text: string; internal: boolean };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function nodeText(node: TiptapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(nodeText).join('');
}

/** Walks the doc once and extracts every signal the editor/SEO panels need. */
export function analyzeContentJson(doc: TiptapNode | null | undefined) {
  const headings: HeadingInfo[] = [];
  const images: ImageInfo[] = [];
  const links: LinkInfo[] = [];
  const paragraphTexts: string[] = [];
  const usedIds = new Map<string, number>();

  function visit(node: TiptapNode) {
    if (!node) return;

    if (node.type === 'heading') {
      const text = nodeText(node).trim();
      const level = (node.attrs?.level as number) || 2;
      let id = slugify(text) || `heading-${headings.length + 1}`;
      const count = usedIds.get(id) ?? 0;
      usedIds.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;
      headings.push({ id, level, text });
    }

    if (node.type === 'figureImage') {
      const src = (node.attrs?.src as string) || '';
      const alt = (node.attrs?.alt as string) || '';
      if (src) images.push({ src, alt, hasAlt: alt.trim().length > 0 });
    }

    if (node.type === 'paragraph') {
      const text = nodeText(node).trim();
      if (text) paragraphTexts.push(text);
    }

    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'link' && mark.attrs?.href) {
          const href = String(mark.attrs.href);
          links.push({
            href,
            text: node.text || '',
            internal: href.startsWith('/') || href.includes('savdown.com'),
          });
        }
      }
    }

    node.content?.forEach(visit);
  }

  if (doc) visit(doc);

  const plainText = doc ? nodeText(doc).replace(/\s+/g, ' ').trim() : '';
  const words = plainText ? plainText.split(/\s+/).filter(Boolean) : [];
  const sentences = plainText
    ? plainText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    plainText,
    wordCount: words.length,
    charCount: plainText.length,
    readingTimeMinutes: Math.max(1, Math.round(words.length / 225)),
    headings,
    images,
    links,
    internalLinks: links.filter((l) => l.internal).length,
    externalLinks: links.filter((l) => !l.internal).length,
    paragraphTexts,
    sentences,
  };
}

export type ContentAnalysis = ReturnType<typeof analyzeContentJson>;
