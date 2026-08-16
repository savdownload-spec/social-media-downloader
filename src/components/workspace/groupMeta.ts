import { Download, Image as ImageIcon, Video, FileText, Sparkles, Search, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ToolGroup } from '@/config/catalog';

/** Icon + tile color per tool group, shared by the Home category cards and the sidebar. */
export const GROUP_META: Record<ToolGroup, { icon: LucideIcon; tile: string }> = {
  Downloaders: { icon: Download, tile: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  Image: { icon: ImageIcon, tile: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
  Video: { icon: Video, tile: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  PDF: { icon: FileText, tile: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400' },
  AI: { icon: Sparkles, tile: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400' },
  SEO: { icon: Search, tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  Utility: { icon: Wrench, tile: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300' },
};
