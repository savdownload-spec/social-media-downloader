import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserActivity } from '@/lib/workspace/activity';
import { getBillingSummary } from '@/lib/billing';
import { UniversalInput } from '@/components/workspace/UniversalInput';
import { ToolCategoryCard } from '@/components/workspace/ToolCategoryCard';
import { ToolCard } from '@/components/workspace/ToolCard';
import { WorkspaceCard, WorkspaceCardGrid } from '@/components/workspace/WorkspaceCard';
import { WorkspaceCreditsBar } from '@/components/workspace/WorkspaceCreditsBar';
import { RecentActivity } from '@/components/workspace/RecentActivity';
import { OnboardingCallout } from '@/components/workspace/OnboardingCallout';
import { SectionHeader } from '@/components/workspace/SectionHeader';
import { GROUP_META } from '@/components/workspace/groupMeta';
import { catalog, toolGroups } from '@/config/catalog';
import { DownloadCloud, History, FolderOpen, Layers, ListChecks } from 'lucide-react';

export const dynamic = 'force-dynamic';

/** First entries of the master catalog — its declared order is already the curated
 *  "most worth seeing first" list (see the doc comment on `catalog` in config/catalog.ts). */
const POPULAR_TOOLS = catalog.slice(0, 4);

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
    <div className="px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-text-subtle">
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">
          What do you want to do?
        </h1>
      </div>

      <div className="max-w-2xl mx-auto w-full space-y-6">
        <UniversalInput />
        <OnboardingCallout />
      </div>

      {billing && <WorkspaceCreditsBar billing={billing} />}

      <div>
        <SectionHeader title="Tools" />
        <WorkspaceCardGrid>
          {toolGroups.map((group) => {
            const meta = GROUP_META[group];
            return <ToolCategoryCard key={group} group={group} icon={meta.icon} tile={meta.tile} />;
          })}
        </WorkspaceCardGrid>
      </div>

      <div>
        <SectionHeader title="Workspace" />
        <WorkspaceCardGrid>
          <WorkspaceCard
            href="/workspace/downloads"
            icon={DownloadCloud}
            tile="bg-primary-light text-primary"
            title="Downloads"
            description="Everything you've processed through SavDown."
            meta={`${allActivity.length} ${allActivity.length === 1 ? 'item' : 'items'}`}
          />
          <WorkspaceCard
            href="/workspace/activity"
            icon={History}
            tile="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
            title="Activity"
            description="Your full workspace history."
            meta={`${allActivity.length} ${allActivity.length === 1 ? 'item' : 'items'}`}
          />
          <WorkspaceCard
            href="/workspace/files"
            icon={FolderOpen}
            tile="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-warning"
            title="My Files"
            description="Files you've saved to your workspace."
            badge="soon"
          />
          <WorkspaceCard
            href="/workspace/collections"
            icon={Layers}
            tile="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
            title="Collections"
            description="Organize saved content into groups."
            badge="soon"
          />
          <WorkspaceCard
            href="/workspace/batch"
            icon={ListChecks}
            tile="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
            title="Batch"
            description="Process multiple items at once."
            badge="soon"
          />
        </WorkspaceCardGrid>
      </div>

      <div>
        <SectionHeader title="Popular Tools" />
        <WorkspaceCardGrid>
          {POPULAR_TOOLS.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </WorkspaceCardGrid>
      </div>

      <div>
        <SectionHeader title="Recent Activity" />
        <RecentActivity items={activity} />
      </div>
    </div>
  );
}
