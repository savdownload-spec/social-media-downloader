import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string } | undefined;
  if (admin?.role !== 'ADMIN' || !admin.id) return fail('Forbidden.', 403);

  const notification = await prisma.adminNotification.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!notification) return fail('Notification not found.', 404);

  await prisma.adminNotificationRead.upsert({
    where: { notificationId_adminId: { notificationId: params.id, adminId: admin.id } },
    create: { notificationId: params.id, adminId: admin.id },
    update: { readAt: new Date() },
  });
  return ok({ read: true });
}
