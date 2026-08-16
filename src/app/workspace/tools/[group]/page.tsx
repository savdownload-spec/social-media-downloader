import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { groupFromSlug } from '@/config/catalog';
import { ToolsBrowser } from '@/components/workspace/ToolsBrowser';

export function generateMetadata({ params }: { params: { group: string } }) {
  const group = groupFromSlug(params.group);
  return { title: group ? `${group} Tools — SavDown Workspace` : 'Tools' };
}

export default function WorkspaceToolGroupPage({ params }: { params: { group: string } }) {
  const group = groupFromSlug(params.group);
  if (!group) return notFound();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-6xl">
      <h1 className="text-xl font-bold text-text">{group} Tools</h1>
      <p className="text-sm text-text-muted mb-5">Browse {group.toLowerCase()} tools.</p>
      <Suspense fallback={null}>
        <ToolsBrowser group={group} />
      </Suspense>
    </div>
  );
}
