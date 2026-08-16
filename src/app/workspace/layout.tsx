import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBillingSummary } from '@/lib/billing';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/workspace');

  const summary = await getBillingSummary(session.user.id);

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
      credits={summary?.totalCredits ?? 0}
    >
      {children}
    </WorkspaceShell>
  );
}
