import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { BusinessDetails } from '@/config/compliance';
import { BusinessContact } from '@/components/layout/BusinessContact';
import { InfoCallout, InfoPageHero, NarrowContent } from '@/components/layout/InfoPage';

type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'list'; items: string[] };

type PolicySection = {
  title: string;
  blocks: ContentBlock[];
};

function parsePolicySections(content: string): PolicySection[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const sections: PolicySection[] = [];
  let current: PolicySection = { title: '', blocks: [] };
  let index = 0;

  const pushCurrent = () => {
    if (current.title || current.blocks.length) sections.push(current);
  };

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      pushCurrent();
      current = { title: line.slice(3).trim(), blocks: [] };
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      current.blocks.push({ type: 'subheading', text: line.slice(4).trim() });
      index += 1;
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('- ')) {
        items.push(lines[index].trim().slice(2).trim());
        index += 1;
      }
      current.blocks.push({ type: 'list', items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || next.startsWith('## ') || next.startsWith('### ') || next.startsWith('- ')) break;
      paragraph.push(next);
      index += 1;
    }
    current.blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  pushCurrent();
  return sections;
}

export function PolicyPage({
  title,
  breadcrumb,
  description,
  updated,
  highlights,
  content,
  business,
}: {
  title: ReactNode;
  breadcrumb: string;
  description: string;
  updated: string;
  highlights: string[];
  content: string;
  business: BusinessDetails;
}) {
  const sections = parsePolicySections(content);

  return (
    <>
      <InfoPageHero
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: breadcrumb }]}
        eyebrow="Legal"
        title={title}
        description={description}
        meta={`Last updated: ${updated}`}
        highlights={highlights.map((label) => ({
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />,
          label,
        }))}
      />

      <NarrowContent className="pb-16">
        <div className="space-y-5">
          {sections.map((section, sectionIndex) => (
            <section
              key={`${section.title}-${sectionIndex}`}
              className="rounded-2xl border border-border-light bg-white p-6 shadow-soft dark:bg-card md:p-8"
            >
              {section.title && (
                <h2 className="text-2xl font-bold tracking-tight text-text">{section.title}</h2>
              )}
              <div className={section.title ? 'mt-4 space-y-4' : 'space-y-4'}>
                {section.blocks.map((block, blockIndex) => {
                  if (block.type === 'subheading') {
                    return <h3 key={blockIndex} className="pt-2 text-lg font-bold text-text">{block.text}</h3>;
                  }
                  if (block.type === 'list') {
                    return (
                      <ul key={blockIndex} className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-muted marker:text-primary">
                        {block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
                      </ul>
                    );
                  }
                  return <p key={blockIndex} className="text-sm leading-7 text-text-muted">{block.text}</p>;
                })}
              </div>
            </section>
          ))}
        </div>
      </NarrowContent>

      <NarrowContent className="pb-16">
        <BusinessContact business={business} />
      </NarrowContent>

      <InfoCallout
        title="Need help with this policy?"
        body="Our support team can answer questions about your account, a digital purchase, or the information above."
        cta={{ label: 'Contact Us', href: '/contact' }}
      />
    </>
  );
}
