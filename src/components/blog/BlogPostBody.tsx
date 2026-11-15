import type { ReactNode } from 'react';
import { ChevronDown, ListTree } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import { BlogAdSlot } from '@/components/blog/BlogAdSlot';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { renderContentJsonToHtml } from '@/lib/content-studio/render';
import { analyzeContentJson, type TiptapNode } from '@/lib/content-studio/contentText';

export type BlogHeading = { title: string; id: string; level: 2 | 3 | 4 | 5 | 6 };

/**
 * Posts saved with the new Content Studio editor carry contentJson (a Tiptap
 * document) and are rendered via the shared generateHTML()+sanitize pipeline.
 * Posts that predate the upgrade (or were never re-saved) have no
 * contentJson and keep using the original hand-rolled markdown renderer
 * below, completely unchanged.
 */
export function getHeadingsForPost(post: BlogPost): BlogHeading[] {
  if (post.contentJson) {
    const analysis = analyzeContentJson(post.contentJson as TiptapNode);
    return analysis.headings
      .filter((h) => h.level >= 2)
      .map((h) => ({ title: h.text, id: h.id, level: h.level as 2 | 3 | 4 | 5 | 6 }));
  }
  return getBlogHeadings(post.content);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getBlogHeadings(content: string): BlogHeading[] {
  const seen = new Map<string, number>();
  return content
    .split('\n')
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const title = match[2].replace(/[*_`]/g, '');
      const base = slugify(title) || 'section';
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return { title, id: count ? `${base}-${count + 1}` : base, level: match[1].length as 2 | 3 };
    });
}

function inline(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/g, '<a href="$2">$1</a>');
}

function renderContent(content: string, headings: BlogHeading[]): ReactNode[] {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let orderedList: string[] = [];
  let key = 0;
  let code: string[] | null = null;
  let headingIndex = 0;
  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={key++} dangerouslySetInnerHTML={{ __html: inline(paragraph.join(' ')) }} />);
      paragraph = [];
    }
  };
  const flushLists = () => {
    if (list.length) {
      blocks.push(<ul key={key++}>{list.map((item, index) => <li key={index} dangerouslySetInnerHTML={{ __html: inline(item) }} />)}</ul>);
      list = [];
    }
    if (orderedList.length) {
      blocks.push(<ol key={key++}>{orderedList.map((item, index) => <li key={index} dangerouslySetInnerHTML={{ __html: inline(item) }} />)}</ol>);
      orderedList = [];
    }
  };
  const flushCode = () => {
    if (code) {
      blocks.push(<pre key={key++}><code>{code.join('\n')}</code></pre>);
      code = null;
    }
  };

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      flushParagraph(); flushLists();
      if (code) flushCode(); else code = [];
      continue;
    }
    if (code) { code.push(raw); continue; }
    if (!line) { flushParagraph(); flushLists(); continue; }
    if (line.startsWith('### ') || line.startsWith('## ')) {
      flushParagraph(); flushLists();
      const heading = headings[headingIndex++];
      if (line.startsWith('### ')) blocks.push(<h3 id={heading?.id} key={key++}>{line.slice(4)}</h3>);
      else blocks.push(<h2 id={heading?.id} key={key++}>{line.slice(3)}</h2>);
      continue;
    }
    // The route shell owns the article-title h1. Treat a legacy Markdown h1
    // as an article section instead of emitting a second page-level heading.
    if (line.startsWith('# ')) { flushParagraph(); flushLists(); blocks.push(<h2 key={key++}>{line.slice(2)}</h2>); continue; }
    if (line.startsWith('> ')) { flushParagraph(); flushLists(); blocks.push(<blockquote key={key++} dangerouslySetInnerHTML={{ __html: inline(line.slice(2)) }} />); continue; }
    if (/^\d+\.\s+/.test(line)) { flushParagraph(); list = []; orderedList.push(line.replace(/^\d+\.\s+/, '')); continue; }
    if (line.startsWith('- ')) { flushParagraph(); orderedList = []; list.push(line.slice(2)); continue; }
    flushLists(); paragraph.push(line);
  }
  flushParagraph(); flushLists(); flushCode();
  return blocks;
}

export function BlogPostBody({ post }: { post: BlogPost }) {
  const headings = getHeadingsForPost(post);
  const usingRichEditor = !!post.contentJson;
  return (
    <div>
      {headings.length >= 2 && (
        <details className="group mb-9 overflow-hidden rounded-2xl border border-border bg-white shadow-soft lg:hidden dark:bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-text marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <ListTree className="h-4 w-4 text-primary" aria-hidden="true" />
              On this page
            </span>
            <ChevronDown
              className="h-4 w-4 text-text-muted transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-border/70 px-3 py-3">
            <TableOfContents headings={headings} mode="mobile" />
          </div>
        </details>
      )}
      {usingRichEditor ? (
        <div className="prose-elegant blog-article-content" dangerouslySetInnerHTML={{ __html: renderContentJsonToHtml(post.contentJson as TiptapNode) }} />
      ) : (
        <div className="prose-elegant blog-article-content">{renderContent(post.content, headings as { title: string; id: string; level: 2 | 3 }[])}</div>
      )}
      {/* Render the in-article placement only when a real ad unit is configured;
          an unconfigured slot would otherwise leave a blank block in the article. */}
      {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && process.env.NEXT_PUBLIC_ADSENSE_IN_ARTICLE_SLOT && (
        <BlogAdSlot slot="IN_ARTICLE_AD" slotId={process.env.NEXT_PUBLIC_ADSENSE_IN_ARTICLE_SLOT} className="my-10" />
      )}
    </div>
  );
}
