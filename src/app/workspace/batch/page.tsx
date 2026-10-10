import { ListChecks } from 'lucide-react';
import { WorkspaceContainer } from '@/components/workspace/WorkspaceContainer';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';
import { WorkspaceEmptyState } from '@/components/workspace/WorkspaceEmptyState';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Batch Download',
  description: '',
  path: '/workspace/batch',
  noIndex: true,
});

export default function WorkspaceBatchPage() {
  return (
    <WorkspaceContainer>
      <WorkspacePageHeader title="Batch" description="Queue up multiple links or files and let SavDown work through them together." />
      <WorkspaceEmptyState
        icon={ListChecks}
        title="Batch processing is coming soon"
        description="Queue up multiple links or files and let SavDown work through them together, with live progress for every item."
      />
    </WorkspaceContainer>
  );
}
