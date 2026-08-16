import { Suspense } from 'react';
import { ToolsBrowser } from '@/components/workspace/ToolsBrowser';

export const metadata = { title: 'All Tools — SavDown Workspace' };

export default function WorkspaceAllToolsPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-7xl">
      <h1 className="text-xl font-bold text-text">All Tools</h1>
      <p className="text-sm text-text-muted mb-5">Every SavDown tool, in one place.</p>
      <Suspense fallback={null}>
        <ToolsBrowser />
      </Suspense>
    </div>
  );
}
