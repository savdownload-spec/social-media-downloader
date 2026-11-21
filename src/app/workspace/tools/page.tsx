import { Suspense } from 'react';
import { ToolsBrowser } from '@/components/workspace/ToolsBrowser';
import { WorkspaceContainer } from '@/components/workspace/WorkspaceContainer';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';
import { getToolStatuses } from '@/lib/toolStatuses';

export const metadata = { title: 'All Tools — SavDown Workspace' };

export default async function WorkspaceAllToolsPage() {
  const toolStatuses = Object.fromEntries(await getToolStatuses());

  return (
    <WorkspaceContainer>
      <WorkspacePageHeader title="All Tools" description="Every SavDown tool, in one place." />
      <Suspense fallback={null}>
        <ToolsBrowser toolStatuses={toolStatuses} />
      </Suspense>
    </WorkspaceContainer>
  );
}
