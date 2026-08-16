import type { ReactNode } from 'react';
import type { BlogPost } from '@/config/blog';
import { BlogAdSlot } from '@/components/blog/BlogAdSlot';
import { renderContentJsonToHtml } from '@/lib/content-studio/render';
import { analyzeContentJson, type TiptapNode } from '@/lib/content-studio/contentText';

export type BlogHeading = { title: string; id: string; level: 2 | 3 | 4 };

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
      .map((h) => ({ title: h.text, id: h.id, level: h.level as 2 | 3 | 4 }));
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
    if (line.startsWith('# ')) { flushParagraph(); flushLists(); blocks.push(<h1 key={key++}>{line.slice(2)}</h1>); continue; }
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
      {headings.length >= 3 && (
        <nav aria-label="Article contents" className="mb-10 rounded-2xl border border-border bg-surface/70 p-5 lg:hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">In this guide</p>
          <ol className="mt-4 grid gap-2">
            {headings.map((heading, index) => (
              <li key={heading.id}>
                <a href={`#${heading.id}`} className={`flex gap-3 rounded-lg px-2 py-1.5 text-sm leading-5 text-text-muted transition-colors hover:bg-white dark:hover:bg-card-hover hover:text-primary ${heading.level >= 3 ? 'pl-8' : ''}`}>
                  <span className="font-semibold text-primary">{String(index + 1).padStart(2, '0')}</span>
                  <span>{heading.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {usingRichEditor ? (
        <div className="prose-elegant" dangerouslySetInnerHTML={{ __html: renderContentJsonToHtml(post.contentJson as TiptapNode) }} />
      ) : (
        <div className="prose-elegant">{renderContent(post.content, headings as { title: string; id: string; level: 2 | 3 }[])}</div>
      )}
      <BlogAdSlot slot="IN_ARTICLE_AD" className="my-10" />
    </div>
  );
}