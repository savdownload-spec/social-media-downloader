import Link from 'next/link';
import { Download, Image as ImageIcon, Video, FileText, Sparkles, Search, Wrench } from 'lucide-react';
import { toolGroups, groupSlug } from '@/config/catalog';

const GROUP_META: Record<(typeof toolGroups)[number], { icon: typeof Download; blurb: string; tile: string }> = {
  Downloaders: { icon: Download, blurb: 'Save from every platform', tile: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  Image: { icon: ImageIcon, blurb: 'Resize, compress, convert', tile: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
  Video: { icon: Video, blurb: 'Convert and compress', tile: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  PDF: { icon: FileText, blurb: 'Merge, split, convert', tile: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400' },
  AI: { icon: Sparkles, blurb: 'AI-assisted tools', tile: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400' },
  SEO: { icon: Search, blurb: 'Titles, tags, schema', tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  Utility: { icon: Wrench, blurb: 'Everyday helpers', tile: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300' },
};

export function QuickActions() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {toolGroups.map((group) => {
          const meta = GROUP_META[group];
          const Icon = meta.icon;
          return (
            <Link
              key={group}
              href={`/workspace/tools/${groupSlug(group)}`}
              className="group flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-border bg-white dark:bg-card hover:border-primary/30 hover:shadow-soft transition-all text-center"
            >
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.tile}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-[12px] font-semibold text-text leading-tight">{group}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
