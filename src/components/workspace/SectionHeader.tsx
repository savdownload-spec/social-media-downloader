interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Consistent section label used above every card grid / data section in the Workspace. */
export function SectionHeader({ title, description, action }: Props) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        <h2 className="text-sm font-semibold text-text-subtle uppercase tracking-wider">{title}</h2>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}
