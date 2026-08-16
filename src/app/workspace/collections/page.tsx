import { Layers } from 'lucide-react';
import { WorkspaceContainer } from '@/components/workspace/WorkspaceContainer';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';
import { WorkspaceEmptyState } from '@/components/workspace/WorkspaceEmptyState';

export const metadata = { title: 'Collections — SavDown Workspace' };

export default function WorkspaceCollectionsPage() {
  return (
    <WorkspaceContainer>
      <WorkspacePageHeader title="Collections" description="Group your favorite downloads and files into named collections." />
      <WorkspaceEmptyState
        icon={Layers}
        title="Collections is coming soon"
        description="Group your favorite downloads and files into named collections — Research, Inspiration, Client Assets, and more."
      />
    </WorkspaceContainer>
  );
}
