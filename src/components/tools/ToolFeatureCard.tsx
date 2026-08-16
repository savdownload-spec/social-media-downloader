import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Compact feature tile for a tool detail page's "Key Features" grid (3-4 per row). */
export function ToolFeatureCard({ icon: Icon, title, description }: Props) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl border border-border-light bg-surface/40">
      <span className="w-9 h-9 rounded-xl bg-primary-light text-primary flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="text-xs text-text-muted leading-snug">{description}</p>
    </div>
  );
}
