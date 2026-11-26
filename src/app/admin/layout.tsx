import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSocialRole, type SocialRole } from '@/lib/social/permissions';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=%2Fadmin');

  // Always re-read the role from the DB on every admin page load.
  // The JWT role claim is stamped at sign-in and can be up to 30 days stale —
  // a demotion made in the DB would otherwise not take effect until the
  // user's token expires. This fresh check closes that window.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isAdmin = dbUser?.role === 'ADMIN';
  let socialRole: SocialRole | null = isAdmin ? 'SUPER_ADMIN' : null;

  if (!socialRole) {
    const membership = await prisma.socialMember.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });
    if (membership && isSocialRole(membership.role)) socialRole = membership.role;
  }

  if (!socialRole) redirect('/');

  // Social editors/publishers may reach ONLY the Social Media Manager. Every
  // other admin page relies on this layout for authorization, so the path
  // check must be server-side and deny by default.
  if (!isAdmin) {
    const pathname = headers().get('x-pathname');
    // Fail closed if middleware did not supply the path (never silently grant
    // access to a full admin page), and avoid a redirect loop on /admin/social.
    if (!pathname) redirect('/');
    if (!pathname.startsWith('/admin/social')) redirect('/admin/social');
  }

  return (
    <AdminShell isAdmin={isAdmin} socialRole={socialRole}>
      {children}
    </AdminShell>
  );
}
