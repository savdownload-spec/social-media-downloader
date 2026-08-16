import { FolderOpen } from 'lucide-react';
import { WorkspaceContainer } from '@/components/workspace/WorkspaceContainer';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';
import { WorkspaceEmptyState } from '@/components/workspace/WorkspaceEmptyState';

export const metadata = { title: 'My Files — SavDown Workspace' };

export default function WorkspaceFilesPage() {
  return (
    <WorkspaceContainer>
      <WorkspacePageHeader title="My Files" description="Everything you've downloaded, uploaded, or generated in SavDown." />
      <WorkspaceEmptyState
        icon={FolderOpen}
        title="My Files is coming soon"
        description="A workspace for everything you've downloaded, uploaded, or generated in SavDown — searchable, sortable, and organized in one place."
      />
    </WorkspaceContainer>
  );
}
