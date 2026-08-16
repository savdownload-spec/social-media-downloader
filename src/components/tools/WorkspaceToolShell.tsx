import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { fallbackIcon, groupSlug, type CatalogTool } from '@/config/catalog';

type Props = {
  tool: CatalogTool;
  /** The actual interactive tool UI (DownloaderForm, or a functional-tool component). */
  children: React.ReactNode;
};

/**
 * Compact, workspace-native wrapper for a tool: breadcrumb + tool UI first,
 * no marketing hero/FAQ/related-tools/long-form SEO content. The public
 * /tools/[slug] page (ToolPageView / FunctionalToolLayout) still carries all
 * of that for SEO/discovery; this shell only links out to it intentionally
 * via "Read full guide".
 */
export function WorkspaceToolShell({ tool, children }: Props) {
  const Icon = tool.icon ?? fallbackIcon;
  const groupLabel = tool.group === 'Downloaders' ? 'Social Media Downloaders' : `${tool.group} Tools`;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-4xl mx-auto space-y-6">
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
          <p className="mt-1 text-sm text-text-muted leading-relaxed">{tool.description}</p>
        </div>
      </div>

      {children}

      <div className="pt-2 border-t border-border-light">
        <Link
          href={`/tools/${tool.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-primary hover:underline"
        >
          Read full guide <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
