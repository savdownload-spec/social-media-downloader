import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { sendContactNotification } from '@/lib/emails';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return fail('Forbidden.', 403);
  }

  const record = await prisma.contactMessage.findUnique({ where: { id: params.id } });
  if (!record) {
    return fail('Contact message not found.', 404);
  }

  const result = await sendContactNotification({
    name: record.name,
    email: record.email,
    subject: record.subject ?? '',
    message: record.message,
    createdAt: record.createdAt,
  });

  await prisma.contactMessage.update({
    where: { id: params.id },
    data: {
      emailNotificationSent: result.notificationSent,
      emailDeliveryFailed: !result.notificationSent,
    },
  });

  if (!result.notificationSent) {
    return fail('Email delivery failed. The record has been updated.', 502);
  }

  return ok({ notificationSent: result.notificationSent, acknowledgementSent: result.acknowledgementSent });
}
