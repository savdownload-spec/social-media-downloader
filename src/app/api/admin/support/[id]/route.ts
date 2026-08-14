import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/api';
import { writeAuditLog } from '@/lib/admin';
import { categoryLabel, cleanSupportText, SUPPORT_PRIORITIES, SUPPORT_STATUSES, supportPreview } from '@/lib/support';
import { sendEmail } from '@/lib/emails';
import { siteConfig } from '@/config/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchBody = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(), priority: z.enum(SUPPORT_PRIORITIES).optional(),
  assignedAdminId: z.string().cuid().nullable().optional(), markUnread: z.boolean().optional(),
  action: z.enum(['reply', 'note']).optional(), message: z.string().min(1).max(5000).optional(),
});
const attachmentSelect = { id: true, fileName: true, contentType: true, size: true, createdAt: true } as const;
const messageSelect = { id: true, senderType: true, senderId: true, body: true, internal: true, createdAt: true, attachments: { select: attachmentSelect } } as const;

async function admin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN' || !session.user.id) return null;
  return { id: session.user.id, email: session.user.email || 'admin' };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!await admin()) return fail('Forbidden.', 403);
  const conversation = await prisma.supportConversation.findUnique({ where: { id: params.id }, include: {
    messages: { orderBy: { createdAt: 'asc' }, select: messageSelect },
    user: { select: { id: true, name: true, email: true, image: true, role: true, plan: true, planCredits: true, purchasedCredits: true, planCreditsResetAt: true, createdAt: true, subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, plan: true, currentPeriodEnd: true, cancelAtPeriodEnd: true } }, downloads: { orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, tool: true, platform: true, status: true, createdAt: true } } } },
    assignedAdmin: { select: { id: true, name: true, email: true } },
  } });
  if (!conversation) return fail('Conversation not found.', 404);
  const [total, previousOpen, resolved] = await Promise.all([
    prisma.supportConversation.count({ where: conversation.userId ? { userId: conversation.userId } : { guestEmail: conversation.guestEmail || undefined } }),
    prisma.supportConversation.count({ where: { ...(conversation.userId ? { userId: conversation.userId } : { guestEmail: conversation.guestEmail || undefined }), status: { in: ['OPEN', 'WAITING_FOR_REPLY', 'IN_PROGRESS'] }, id: { not: conversation.id } } }),
    prisma.supportConversation.count({ where: { ...(conversation.userId ? { userId: conversation.userId } : { guestEmail: conversation.guestEmail || undefined }), status: 'RESOLVED' } }),
  ]);
  await prisma.supportConversation.update({ where: { id: params.id }, data: { adminUnreadCount: 0, adminLastReadAt: new Date() } });
  return ok({ ...conversation, adminUnreadCount: 0, customerContext: { conversationCount: total, previousOpen, resolved } });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const actor = await admin(); if (!actor) return fail('Forbidden.', 403);
  try {
    const data = patchBody.parse(await request.json());
    const conversation = await prisma.supportConversation.findUnique({ where: { id: params.id } });
    if (!conversation) return fail('Conversation not found.', 404);
    if (data.assignedAdminId) {
      const assignee = await prisma.user.findFirst({ where: { id: data.assignedAdminId, role: 'ADMIN' }, select: { id: true } });
      if (!assignee) return fail('Assigned team member was not found.');
    }
    if (data.action) {
      const body = cleanSupportText(data.message || ''); if (!body) return fail('Please enter a message.');
      const internal = data.action === 'note'; const now = new Date();
      const message = await prisma.$transaction(async (tx) => {
        const created = await tx.supportMessage.create({ data: { conversationId: params.id, senderType: 'ADMIN', senderId: actor.id, body, internal }, select: messageSelect });
        await tx.supportConversation.update({ where: { id: params.id }, data: internal ? { lastMessageAt: now } : { status: 'WAITING_FOR_REPLY', customerUnreadCount: { increment: 1 }, lastMessageAt: now, lastMessagePreview: supportPreview(body) } });
        return created;
      });
      if (!internal) {
        const recipient = conversation.guestEmail || (conversation.userId ? (await prisma.user.findUnique({ where: { id: conversation.userId }, select: { email: true } }))?.email : null);
        if (recipient) sendEmail({ to: recipient, subject: `New reply from ${siteConfig.name} Support`, text: `We replied to your ${categoryLabel(conversation.category)} request. Open the conversation: ${siteConfig.url}/`, html: `<p>We replied to your <strong>${categoryLabel(conversation.category)}</strong> request.</p><p><a href="${siteConfig.url}">Open support</a></p>` }).catch(() => {});
      }
      await writeAuditLog({ adminId: actor.id, adminEmail: actor.email, action: internal ? 'support.note' : 'support.reply', targetType: 'SupportConversation', targetId: params.id });
      return ok(message);
    }
    const update: Record<string, unknown> = {};
    if (data.status) { update.status = data.status; update.resolvedAt = data.status === 'RESOLVED' ? new Date() : null; }
    if (data.priority) update.priority = data.priority;
    if (data.assignedAdminId !== undefined) update.assignedAdminId = data.assignedAdminId;
    if (data.markUnread) update.adminUnreadCount = 1;
    const updated = await prisma.supportConversation.update({ where: { id: params.id }, data: update });
    await writeAuditLog({ adminId: actor.id, adminEmail: actor.email, action: 'support.update', targetType: 'SupportConversation', targetId: params.id, detail: update });
    return ok(updated);
  } catch (error) { const message = error instanceof z.ZodError ? error.errors[0]?.message : 'Invalid support update.'; return fail(message || 'Invalid support update.'); }
}
