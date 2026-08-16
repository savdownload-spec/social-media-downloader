import { Suspense } from 'react';
import { ToolsBrowser } from '@/components/workspace/ToolsBrowser';
import { WorkspaceContainer } from '@/components/workspace/WorkspaceContainer';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';

export const metadata = { title: 'All Tools — SavDown Workspace' };

export default function WorkspaceAllToolsPage() {
  return (
    <WorkspaceContainer>
      <WorkspacePageHeader title="All Tools" description="Every SavDown tool, in one place." />
      <Suspense fallback={null}>
        <ToolsBrowser />
      </Suspense>
    </WorkspaceContainer>
  );
}
