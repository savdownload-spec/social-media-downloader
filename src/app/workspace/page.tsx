import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserActivity } from '@/lib/workspace/activity';
import { UniversalInput } from '@/components/workspace/UniversalInput';
import { QuickActions } from '@/components/workspace/QuickActions';
import { RecentActivity } from '@/components/workspace/RecentActivity';
import { OnboardingCallout } from '@/components/workspace/OnboardingCallout';

export const dynamic = 'force-dynamic';

export default async function WorkspaceHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/workspace');

  const activity = await getUserActivity(session.user.id, 5);
  const firstName = session.user.name?.split(' ')[0];

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-10 md:py-14 space-y-10">
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-text-subtle">
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          What do you want to do?
        </h1>
      </div>

      <UniversalInput />
      <QuickActions />
      <OnboardingCallout />

      <div>
        <h2 className="text-sm font-semibold text-text-subtle uppercase tracking-wider mb-3 max-w-2xl mx-auto">
          Recent Activity
        </h2>
        <RecentActivity items={activity} />
      </div>
    </div>
  );
}
