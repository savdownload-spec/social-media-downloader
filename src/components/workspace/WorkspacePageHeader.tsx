interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** 'left' (default) for information pages; 'center' for hero-style pages like Pricing. */
  align?: 'left' | 'center';
}

/** Standard page header used by every Workspace page except Home
 *  (whose hero stays center-aligned as the app's one deliberate exception). */
export function WorkspacePageHeader({ title, description, action, align = 'left' }: Props) {
  if (align === 'center') {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
        {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
        {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
