import { ListChecks } from 'lucide-react';
import { WorkspaceEmptyState } from '@/components/workspace/WorkspaceEmptyState';

export default function WorkspaceBatchPage() {
  return (
    <WorkspaceEmptyState
      icon={ListChecks}
      title="Batch processing is coming soon"
      description="Queue up multiple links or files and let SavDown work through them together, with live progress for every item."
    />
  );
}
