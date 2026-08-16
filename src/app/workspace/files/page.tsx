import { FolderOpen } from 'lucide-react';
import { WorkspaceEmptyState } from '@/components/workspace/WorkspaceEmptyState';

export default function WorkspaceFilesPage() {
  return (
    <WorkspaceEmptyState
      icon={FolderOpen}
      title="My Files is coming soon"
      description="A workspace for everything you've downloaded, uploaded, or generated in SavDown — searchable, sortable, and organized in one place."
    />
  );
}
