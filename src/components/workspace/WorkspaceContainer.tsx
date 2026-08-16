import { cn } from '@/lib/utils';

/**
 * The single Workspace content container — same max-width, padding, and
 * vertical rhythm as the Home page (the master layout). Every Workspace
 * page renders its content inside this, so every page starts and ends at
 * the same horizontal position.
 */
export function WorkspaceContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-7xl mx-auto space-y-8', className)}>
      {children}
    </div>
  );
}
