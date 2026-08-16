import { Layers } from 'lucide-react';
import { WorkspaceEmptyState } from '@/components/workspace/WorkspaceEmptyState';

export default function WorkspaceCollectionsPage() {
  return (
    <WorkspaceEmptyState
      icon={Layers}
      title="Collections is coming soon"
      description="Group your favorite downloads and files into named collections — Research, Inspiration, Client Assets, and more."
    />
  );
}
