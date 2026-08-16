import type { ComponentType } from 'react';
import {
  MonitorPlay, Image, Film, FileText, Sparkles, Search, Layers,
} from 'lucide-react';
import { toolGroups as _toolGroups } from '@/config/catalog';
import type { ToolGroup } from '@/config/catalog';

export { _toolGroups as toolGroups };

export const GROUP_META_MOBILE: Record<ToolGroup, {
  icon: ComponentType<{ className?: string }>;
  color: string;
  label: string;
}> = {
  Downloaders: { icon: MonitorPlay, color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/15',  label: 'Downloaders' },
  Image:       { icon: Image,       color: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-500/15',        label: 'Image'       },
  Video:       { icon: Film,        color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/15',      label: 'Video'       },
  PDF:         { icon: FileText,    color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/15',  label: 'PDF'         },
  AI:          { icon: Sparkles,    color: 'text-fuchsia-600 bg-fuchsia-50 dark:text-fuchsia-400 dark:bg-fuchsia-500/15',label: 'AI'          },
  SEO:         { icon: Search,      color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/15',label: 'SEO'         },
  Utility:     { icon: Layers,      color: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-500/15',   label: 'Utility'     },
};
