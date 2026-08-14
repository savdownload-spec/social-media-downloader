import type { ReactNode } from 'react';
import type { BlogPost } from '@/config/blog';
import { BlogAdSlot } from '@/components/blog/BlogAdSlot';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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

function getHeadings(content: string) {
  return content
    .split('\n')
    .map((line) => line.match(/^##\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ title: match[1].replace(/[*_`]/g, ''), id: slugify(match[1]) }));
}

function renderContent(content: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let orderedList: string[] = [];
  let key = 0;
  let code: string[] | null = null;

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
      if (code) flushCode();
      else code = [];
      continue;
    }
    if (code) { code.push(raw); continue; }
    if (!line) { flushParagraph(); flushLists(); continue; }
    if (line.startsWith('### ')) { flushParagraph(); flushLists(); blocks.push(<h3 key={key++}>{line.slice(4)}</h3>); continue; }
    if (line.startsWith('## ')) { flushParagraph(); flushLists(); const heading = line.slice(3); blocks.push(<h2 id={slugify(heading)} key={key++}>{heading}</h2>); continue; }
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
  const headings = getHeadings(post.content);

  return (
    <div>
      {headings.length > 1 && (
        <nav aria-label="Article contents" className="mb-10 rounded-2xl border border-border bg-surface/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">In this guide</p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {headings.map((heading, index) => (
              <li key={heading.id}>
                <a href={`#${heading.id}`} className="flex gap-3 rounded-lg px-2 py-1.5 text-sm leading-5 text-text-muted transition-colors hover:bg-white hover:text-primary">
                  <span className="font-semibold text-primary">{String(index + 1).padStart(2, '0')}</span>
                  <span>{heading.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="prose-elegant">{renderContent(post.content)}</div>
      <BlogAdSlot slot="IN_ARTICLE_AD" className="my-10" />
    </div>
  );
}
