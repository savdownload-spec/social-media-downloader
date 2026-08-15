import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/api';
import { canAccessSupportConversation } from '@/lib/support';
import { detectSupportLanguage, translateSupportMessage } from '@/lib/support-translation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const messageSelect = {
  id: true,
  conversationId: true,
  senderType: true,
  senderId: true,
  body: true,
  originalMessage: true,
  detectedLanguage: true,
  translatedMessage: true,
  translationStatus: true,
  internal: true,
  createdAt: true,
} as const;

export async function POST(request: Request, { params }: { params: { messageId: string } }) {
  const message = await prisma.supportMessage.findUnique({ where: { id: params.messageId }, select: messageSelect });
  if (!message || message.senderType !== 'CUSTOMER' || message.internal) return fail('Message not found.', 404);

  const access = await canAccessSupportConversation(message.conversationId, request);
  if (!access.allowed) return fail('Forbidden.', 403);

  if (message.translationStatus === 'TRANSLATED' && message.translatedMessage) return ok(message);

  const originalMessage = message.originalMessage || message.body;
  const detectedLanguage = message.detectedLanguage || detectSupportLanguage(originalMessage);
  const result = await translateSupportMessage(originalMessage, detectedLanguage);
  const updated = await prisma.supportMessage.update({
    where: { id: message.id },
    data: {
      originalMessage,
      detectedLanguage: result.detectedLanguage,
      translatedMessage: result.translatedMessage,
      translationStatus: result.translationStatus,
    },
    select: messageSelect,
  });
  return ok(updated);
}
