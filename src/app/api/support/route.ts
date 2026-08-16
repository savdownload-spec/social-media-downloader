import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/api';
import { getClientId, ratelimit } from '@/lib/ratelimit';
import { SUPPORT_CATEGORIES, cleanSupportText, hashSupportGuestToken, supportActor, supportGuestToken, supportPreview } from '@/lib/support';
import { detectSupportLanguage, translateSupportMessage } from '@/lib/support-translation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACKNOWLEDGEMENT = 'Thanks for reaching out. Your message has been received. Our support team will respond here as soon as possible.';

const Create = z.object({
  category: z.enum(SUPPORT_CATEGORIES),
  message: z.string().min(1).max(5000),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(254).optional(),
});

export async function GET(request: Request) {
  const actor = await supportActor();
  if (!actor.userId) return ok({ conversations: [], unreadCount: 0 });
  const conversations = await prisma.supportConversation.findMany({
    where: { userId: actor.userId }, orderBy: { lastMessageAt: 'desc' }, take: 30,
    select: { id: true, category: true, status: true, priority: true, lastMessagePreview: true, lastMessageAt: true, customerUnreadCount: true, createdAt: true },
  });
  return ok({ conversations, unreadCount: conversations.reduce((n, c) => n + c.customerUnreadCount, 0) });
}

export async function POST(request: Request) {
  const actor = await supportActor();
  const rl = await ratelimit(`support:new:${actor.userId || getClientId(request)}`, { limit: actor.userId ? 8 : 3, windowSeconds: 600 });
  if (!rl.success) return fail('Too many new conversations. Please wait a few minutes.', 429);
  try {
    const parsed = Create.parse(await request.json());
    const message = cleanSupportText(parsed.message);
    if (!message) return fail('Please enter a message.');
    const detectedLanguage = detectSupportLanguage(message);
    const translation = await translateSupportMessage(message, detectedLanguage);
    if (!actor.userId && (!parsed.name || !parsed.email)) return fail('Please enter your name and a valid email address.');
    const guestToken = actor.userId ? null : supportGuestToken();
    const conversation = await prisma.supportConversation.create({
      data: {
        userId: actor.userId,
        guestName: actor.userId ? null : cleanSupportText(parsed.name!),
        guestEmail: actor.userId ? null : parsed.email!.toLowerCase(),
        guestTokenHash: guestToken ? hashSupportGuestToken(guestToken) : null,
        category: parsed.category,
        status: 'OPEN', lastMessagePreview: supportPreview(message),
        adminUnreadCount: 1,
        messages: { create: [
          { senderType: 'CUSTOMER', senderId: actor.userId ?? null, body: message, originalMessage: message, detectedLanguage: translation.detectedLanguage, translatedMessage: translation.translatedMessage, translationStatus: translation.translationStatus },
          { senderType: 'SYSTEM', body: ACKNOWLEDGEMENT, originalMessage: ACKNOWLEDGEMENT, translationStatus: 'NOT_NEEDED' },
        ] },
      },
      select: { id: true, category: true, status: true, priority: true, lastMessagePreview: true, lastMessageAt: true, customerUnreadCount: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, data: { conversation, guestToken } }, { status: 201 });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0]?.message : 'Invalid support request.';
    return fail(message || 'Invalid support request.');
  }
}
