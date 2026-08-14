import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/api';
import { getClientId, ratelimit } from '@/lib/ratelimit';
import { canAccessSupportConversation, cleanSupportText, MAX_SUPPORT_FILES, MAX_SUPPORT_FILE_SIZE, SUPPORT_ATTACHMENT_TYPES, supportPreview } from '@/lib/support';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const attachmentSelect = { id: true, fileName: true, contentType: true, size: true, createdAt: true } as const;
const messageSelect = { id: true, senderType: true, senderId: true, body: true, internal: true, createdAt: true, attachments: { select: attachmentSelect } } as const;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const access = await canAccessSupportConversation(params.id, request);
  if (!access.conversation) return fail('Conversation not found.', 404);
  if (!access.allowed) return fail('Forbidden.', 403);
  const conversation = await prisma.supportConversation.findUnique({
    where: { id: params.id },
    include: {
      messages: { where: access.actor.isAdmin ? undefined : { internal: false }, orderBy: { createdAt: 'asc' }, select: messageSelect },
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
  if (!conversation) return fail('Conversation not found.', 404);
  return ok(conversation);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const access = await canAccessSupportConversation(params.id, request);
  if (!access.conversation) return fail('Conversation not found.', 404);
  if (!access.allowed || access.actor.isAdmin) return fail('Forbidden.', 403);
  const rl = await ratelimit(`support:message:${access.actor.userId || getClientId(request)}`, { limit: 12, windowSeconds: 300 });
  if (!rl.success) return fail('You are sending messages too quickly. Please wait a moment.', 429);
  try {
    const form = await request.formData();
    const body = cleanSupportText(z.string().min(1).max(5000).parse(form.get('message')));
    const files = form.getAll('attachments').filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (!body) return fail('Please enter a message.');
    if (files.length > MAX_SUPPORT_FILES) return fail(`You can attach up to ${MAX_SUPPORT_FILES} files.`);
    let total = 0;
    for (const file of files) {
      total += file.size;
      if (!SUPPORT_ATTACHMENT_TYPES.includes(file.type as typeof SUPPORT_ATTACHMENT_TYPES[number]) || file.size > MAX_SUPPORT_FILE_SIZE || total > MAX_SUPPORT_FILE_SIZE * MAX_SUPPORT_FILES) {
        return fail('Attachments must be PNG, JPG, WebP, PDF, or text files up to 4 MB each.');
      }
    }
    const now = new Date();
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({
        data: {
          conversationId: params.id, senderType: 'CUSTOMER', senderId: access.actor.userId ?? null, body,
          attachments: { create: await Promise.all(files.map(async (file) => ({ fileName: file.name.replace(/[\\/\x00]/g, '_').slice(0, 180), contentType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) }))) },
        }, select: messageSelect,
      });
      await tx.supportConversation.update({ where: { id: params.id }, data: {
        status: access.conversation.status === 'RESOLVED' || access.conversation.status === 'CLOSED' ? 'OPEN' : 'OPEN',
        resolvedAt: null, adminUnreadCount: { increment: 1 }, lastMessageAt: now, lastMessagePreview: supportPreview(body),
      } });
      return created;
    });
    return ok(message, 201);
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0]?.message : 'Could not send your message.';
    return fail(message || 'Could not send your message.');
  }
}
