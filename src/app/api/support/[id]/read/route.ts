import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/api';
import { canAccessSupportConversation } from '@/lib/support';

export const runtime = 'nodejs';
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const access = await canAccessSupportConversation(params.id, request);
  if (!access.conversation) return fail('Conversation not found.', 404);
  if (!access.allowed || access.actor.isAdmin) return fail('Forbidden.', 403);
  await prisma.supportConversation.update({ where: { id: params.id }, data: { customerUnreadCount: 0, customerLastReadAt: new Date() } });
  return ok({ read: true });
}
