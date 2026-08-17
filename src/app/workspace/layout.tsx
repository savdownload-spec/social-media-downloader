import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBillingSummary } from '@/lib/billing';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/workspace');

  const summary = await getBillingSummary(session.user.id);

  // The JWT's role claim is only refreshed on sign-in, so a suspension made
  // after the user's session was issued would otherwise go unnoticed here
  // until the token naturally rotates. Check the fresh DB read instead.
  if (summary?.role === 'SUSPENDED') redirect('/login?callbackUrl=/workspace&suspended=1');

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
