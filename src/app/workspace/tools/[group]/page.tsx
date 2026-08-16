import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { groupFromSlug } from '@/config/catalog';
import { ToolsBrowser } from '@/components/workspace/ToolsBrowser';
import { WorkspaceContainer } from '@/components/workspace/WorkspaceContainer';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export function generateMetadata({ params }: { params: { group: string } }) {
  const group = groupFromSlug(params.group);
  return { title: group ? `${group} Tools — SavDown Workspace` : 'Tools' };
}

export default function WorkspaceToolGroupPage({ params }: { params: { group: string } }) {
  const group = groupFromSlug(params.group);
  if (!group) return notFound();

  return (
    <WorkspaceContainer>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/workspace' },
          { label: 'Tools', href: '/workspace/tools' },
          { label: group },
        ]}
      />
      <WorkspacePageHeader title={`${group} Tools`} description={`Browse ${group.toLowerCase()} tools.`} />
      <Suspense fallback={null}>
        <ToolsBrowser group={group} />
      </Suspense>
    </WorkspaceContainer>
  );
}
