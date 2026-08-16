import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserActivity } from '@/lib/workspace/activity';
import { DownloadsTable } from '@/components/workspace/DownloadsTable';

export const dynamic = 'force-dynamic';

export default async function WorkspaceActivityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/workspace/activity');

  const items = await getUserActivity(session.user.id, 200);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 md:py-10 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Activity</h1>
        <p className="text-sm text-text-muted mt-1">
          Your full history across every SavDown tool.
        </p>
      </div>
      <DownloadsTable items={items} />
    </div>
  );
}
