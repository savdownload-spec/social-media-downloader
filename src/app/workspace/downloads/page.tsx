import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserActivity } from '@/lib/workspace/activity';
import { DownloadsTable } from '@/components/workspace/DownloadsTable';
import { WorkspaceContainer } from '@/components/workspace/WorkspaceContainer';
import { WorkspacePageHeader } from '@/components/workspace/WorkspacePageHeader';

export const dynamic = 'force-dynamic';

export default async function WorkspaceDownloadsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/workspace/downloads');

  const items = await getUserActivity(session.user.id, 200);

  return (
    <WorkspaceContainer>
      <WorkspacePageHeader
        title="Downloads"
        description="Every download you've run through SavDown, most recent first."
      />
      <DownloadsTable items={items} />
    </WorkspaceContainer>
  );
}
