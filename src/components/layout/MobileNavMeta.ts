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
  Downloaders: { icon: MonitorPlay, color: 'text-violet-600 bg-violet-50',  label: 'Downloaders' },
  Image:       { icon: Image,       color: 'text-sky-600 bg-sky-50',        label: 'Image'       },
  Video:       { icon: Film,        color: 'text-rose-600 bg-rose-50',      label: 'Video'       },
  PDF:         { icon: FileText,    color: 'text-orange-600 bg-orange-50',  label: 'PDF'         },
  AI:          { icon: Sparkles,    color: 'text-fuchsia-600 bg-fuchsia-50',label: 'AI'          },
  SEO:         { icon: Search,      color: 'text-emerald-600 bg-emerald-50',label: 'SEO'         },
  Utility:     { icon: Layers,      color: 'text-slate-600 bg-slate-100',   label: 'Utility'     },
};
