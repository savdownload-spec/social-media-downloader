import type { LucideIcon } from 'lucide-react';
import { Zap, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { fallbackIcon, groupSlug, type CatalogTool } from '@/config/catalog';
import { PrimaryCTA } from '@/components/workspace/CTAButtons';
import { SectionHeader } from '@/components/workspace/SectionHeader';
import { ToolFeatureCard } from './ToolFeatureCard';
import { ToolFaqAccordion } from './ToolFaqAccordion';

export type WorkspaceToolContent = {
  /** Short line shown right under the title — falls back to tool.description. */
  tagline?: string;
  /** Longer "About this tool" paragraph. */
  about?: string;
  features?: { icon: LucideIcon; title: string; body: string }[];
  howTo?: { title: string; body: string }[];
  faq?: { question: string; answer: string }[];
  supportedFormats?: string[];
};

type Props = {
  tool: CatalogTool;
  /** The actual interactive tool UI (DownloaderForm, or a functional-tool component). */
  children: React.ReactNode;
  content?: WorkspaceToolContent;
};

/**
 * Workspace-native tool page: breadcrumb + tool UI first (the priority),
 * followed by a shortened version of the tool's real content (about,
 * features, how-it-works, formats, FAQ) pulled from the same source the
 * public /tools/[slug] page uses — not reproducing its full long-form SEO
 * article. Ends with a large "Read Full Guide" CTA out to that public page.
 */
export function WorkspaceToolShell({ tool, children, content }: Props) {
  const Icon = tool.icon ?? fallbackIcon;
  const groupLabel = tool.group === 'Downloaders' ? 'Social Media Downloaders' : `${tool.group} Tools`;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-4xl mx-auto space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/workspace' },
          { label: 'Tools', href: '/workspace/tools' },
          { label: groupLabel, href: `/workspace/tools/${groupSlug(tool.group)}` },
          { label: tool.name },
        ]}
      />

      <div className="flex items-start gap-3.5">
        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tool.tile}`}>
          <Icon className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">{tool.name}</h1>
          <p className="mt-1 text-sm text-text-muted leading-relaxed">{content?.tagline ?? tool.description}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-light text-[11px] font-semibold text-accent-hover">
            <Zap className="w-3 h-3" /> Free tool, no signup
          </span>
        </div>
      </div>

      {/* Main tool functionality — the priority */}
      {children}

      {content?.about && (
        <div>
          <SectionHeader title="About This Tool" />
          <p className="text-sm text-text-muted leading-relaxed">{content.about}</p>
        </div>
      )}

      {content?.features && content.features.length > 0 && (
        <div>
          <SectionHeader title="Key Features" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {content.features.map((f) => (
              <ToolFeatureCard key={f.title} icon={f.icon} title={f.title} description={f.body} />
            ))}
          </div>
        </div>
      )}

      {content?.howTo && content.howTo.length > 0 && (
        <div>
          <SectionHeader title="How It Works" />
          <ol className="space-y-2.5">
            {content.howTo.map((step, i) => (
              <li key={step.title} className="flex gap-3 p-3.5 rounded-xl bg-surface/60">
                <span className="w-6 h-6 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text">{step.title}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {content?.supportedFormats && content.supportedFormats.length > 0 && (
        <div>
          <SectionHeader title="Supported Formats" />
          <div className="flex flex-wrap gap-2.5">
            {content.supportedFormats.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-card border border-border text-sm font-medium text-text"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {content?.faq && content.faq.length > 0 && (
        <div>
          <SectionHeader title="FAQ" />
          <ToolFaqAccordion items={content.faq} />
        </div>
      )}

      <PrimaryCTA href={`/tools/${tool.slug}`} external>
        Read Full Guide <ArrowUpRight className="w-4 h-4" />
      </PrimaryCTA>
    </div>
  );
}
