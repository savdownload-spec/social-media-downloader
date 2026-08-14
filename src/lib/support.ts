import { createHash, randomBytes } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const SUPPORT_CATEGORIES = [
  'GENERAL_QUESTION', 'DOWNLOAD_PROBLEM', 'TOOL_NOT_WORKING', 'ACCOUNT_PROBLEM',
  'CREDITS_USAGE', 'SUBSCRIPTION_BILLING', 'REFUND_REQUEST', 'REPORT_A_PROBLEM',
  'AFFILIATE_PARTNERSHIP', 'OTHER',
] as const;
export const SUPPORT_STATUSES = ['OPEN', 'WAITING_FOR_REPLY', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export const SUPPORT_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const SUPPORT_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'] as const;
export const MAX_SUPPORT_FILE_SIZE = 4 * 1024 * 1024;
export const MAX_SUPPORT_FILES = 4;

export function supportGuestToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSupportGuestToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function cleanSupportText(value: string) {
  return value.replace(/\u0000/g, '').trim();
}

export function supportPreview(value: string) {
  return cleanSupportText(value).replace(/\s+/g, ' ').slice(0, 240);
}

export async function supportActor() {
  const session = await getServerSession(authOptions);
  return {
    userId: session?.user?.id,
    isAdmin: session?.user?.role === 'ADMIN',
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
  };
}

export function readGuestToken(request: Request) {
  return request.headers.get('x-support-token')?.trim() || new URL(request.url).searchParams.get('token')?.trim() || '';
}

export async function canAccessSupportConversation(id: string, request: Request) {
  const actor = await supportActor();
  const conversation = await prisma.supportConversation.findUnique({ where: { id } });
  if (!conversation) return { conversation: null, actor, allowed: false };
  if (actor.isAdmin || (actor.userId && conversation.userId === actor.userId)) return { conversation, actor, allowed: true };
  const token = readGuestToken(request);
  return { conversation, actor, allowed: !!token && conversation.guestTokenHash === hashSupportGuestToken(token) };
}

export function categoryLabel(category: string) {
  return category.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
