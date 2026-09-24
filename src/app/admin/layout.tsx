import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  // Always re-read the role from the DB on every admin page load.
  // The JWT role claim is stamped at sign-in and can be up to 30 days stale —
  // a demotion made in the DB would otherwise not take effect until the
  // user's token expires. This fresh check closes that window.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (dbUser?.role !== 'ADMIN') redirect('/');

  return <AdminShell>{children}</AdminShell>;
}
