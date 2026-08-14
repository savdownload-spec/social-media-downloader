import { prisma } from '@/lib/prisma';
import { fail } from '@/lib/api';
import { canAccessSupportConversation } from '@/lib/support';

export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const attachment = await prisma.supportAttachment.findUnique({ where: { id: params.id }, select: { fileName: true, contentType: true, data: true, message: { select: { conversationId: true } } } });
  if (!attachment) return fail('Attachment not found.', 404);
  const access = await canAccessSupportConversation(attachment.message.conversationId, request);
  if (!access.allowed) return fail('Forbidden.', 403);
  return new Response(new Uint8Array(attachment.data), { headers: {
    'content-type': attachment.contentType,
    'content-disposition': `attachment; filename="${attachment.fileName.replace(/[\r\n"]/g, '_')}"`,
    'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store',
  } });
}
