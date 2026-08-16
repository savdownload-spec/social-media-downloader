import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Honest "not built yet" screen — no fake data, no dead buttons. */
export function WorkspaceEmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-16 md:py-24">
      <div className="max-w-md mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-5">
          <Icon className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-text">{title}</h1>
        <p className="mt-2.5 text-sm text-text-muted leading-relaxed">{description}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border-light text-[11px] font-bold uppercase tracking-wider text-text-subtle">
          Coming soon
        </span>
      </div>
    </div>
  );
}
