import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserActivity } from '@/lib/workspace/activity';
import { getBillingSummary } from '@/lib/billing';
import { UniversalInput } from '@/components/workspace/UniversalInput';
import { ToolCategoryCard } from '@/components/workspace/ToolCategoryCard';
import { WorkspaceSectionCard } from '@/components/workspace/WorkspaceSectionCard';
import { RecentActivity } from '@/components/workspace/RecentActivity';
import { OnboardingCallout } from '@/components/workspace/OnboardingCallout';
import { WorkspaceHomeSidebar } from '@/components/workspace/WorkspaceHomeSidebar';
import { GROUP_META } from '@/components/workspace/groupMeta';
import { toolGroups } from '@/config/catalog';
import { DownloadCloud, History, FolderOpen, Layers, ListChecks } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WorkspaceHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/workspace');

  const [allActivity, billing] = await Promise.all([
    getUserActivity(session.user.id, 200),
    getBillingSummary(session.user.id),
  ]);
  const firstName = session.user.name?.split(' ')[0];
  const activity = allActivity.slice(0, 5);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        {/* Main column */}
        <div className="space-y-6 min-w-0">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-subtle">
              {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">
              What do you want to do?
            </h1>
          </div>

          <div className="max-w-2xl w-full space-y-6">
            <UniversalInput />
            <OnboardingCallout />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-text-subtle uppercase tracking-wider mb-3">Tools</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {toolGroups.map((group) => {
                const meta = GROUP_META[group];
                return <ToolCategoryCard key={group} group={group} icon={meta.icon} tile={meta.tile} />;
              })}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-text-subtle uppercase tracking-wider mb-3">Workspace</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <WorkspaceSectionCard
                title="Downloads"
                description="Everything you've processed through SavDown."
                href="/workspace/downloads"
                icon={DownloadCloud}
                tile="bg-primary-light text-primary"
                count={allActivity.length}
              />
              <WorkspaceSectionCard
                title="Activity"
                description="Your full workspace history."
                href="/workspace/activity"
                icon={History}
                tile="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
                count={allActivity.length}
              />
              <WorkspaceSectionCard
                title="My Files"
                description="Files you've saved to your workspace."
                href="/workspace/files"
                icon={FolderOpen}
                tile="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-warning"
                soon
              />
              <WorkspaceSectionCard
                title="Collections"
                description="Organize saved content into groups."
                href="/workspace/collections"
                icon={Layers}
                tile="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
                soon
              />
              <WorkspaceSectionCard
                title="Batch"
                description="Process multiple items at once."
                href="/workspace/batch"
                icon={ListChecks}
                tile="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                soon
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-text-subtle uppercase tracking-wider mb-3">Recent Activity</h2>
            <RecentActivity items={activity} />
          </div>
        </div>

        {/* Right column */}
        {billing && <WorkspaceHomeSidebar billing={billing} />}
      </div>
    </div>
  );
}
