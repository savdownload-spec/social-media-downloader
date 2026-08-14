import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/api';
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from '@/lib/support';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return fail('Forbidden.', 403);
  const p = new URL(request.url).searchParams;
  const folder = p.get('folder'); const status = p.get('status'); const priority = p.get('priority');
  const category = p.get('category'); const assigned = p.get('assigned'); const search = p.get('search')?.trim();
  const sort = p.get('sort') === 'oldest' ? 'asc' : 'desc';
  const date = p.get('date');
  const where: Prisma.SupportConversationWhereInput = {};
  if (status && SUPPORT_STATUSES.includes(status as typeof SUPPORT_STATUSES[number])) where.status = status;
  if (priority && SUPPORT_PRIORITIES.includes(priority as typeof SUPPORT_PRIORITIES[number])) where.priority = priority;
  if (category && SUPPORT_CATEGORIES.includes(category as typeof SUPPORT_CATEGORIES[number])) where.category = category;
  if (assigned === 'unassigned' || folder === 'UNASSIGNED') where.assignedAdminId = null;
  if (assigned && assigned !== 'unassigned') where.assignedAdminId = assigned;
  if (folder === 'OPEN') where.status = 'OPEN';
  if (folder === 'WAITING_FOR_REPLY') where.status = 'WAITING_FOR_REPLY';
  if (folder === 'IN_PROGRESS') where.status = 'IN_PROGRESS';
  if (folder === 'RESOLVED') where.status = 'RESOLVED';
  if (folder === 'CLOSED') where.status = 'CLOSED';
  if (date && /^\d+$/.test(date)) where.createdAt = { gte: new Date(Date.now() - Number(date) * 86400000) };
  if (search) where.OR = [
    { guestName: { contains: search, mode: 'insensitive' } }, { guestEmail: { contains: search, mode: 'insensitive' } },
    { user: { name: { contains: search, mode: 'insensitive' } } }, { user: { email: { contains: search, mode: 'insensitive' } } },
    { lastMessagePreview: { contains: search, mode: 'insensitive' } },
  ];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const week = new Date(Date.now() - 7 * 86400000);
  const metricsSince = new Date(Date.now() - 90 * 86400000);
  const [conversations, admins, open, waiting, unassigned, urgent, resolvedToday, todayCount, weekCount, analyticsSample] = await Promise.all([
    prisma.supportConversation.findMany({ where, orderBy: { lastMessageAt: sort }, take: 100, include: { user: { select: { id: true, name: true, email: true, image: true } }, assignedAdmin: { select: { id: true, name: true, email: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { senderType: true, internal: true } } } }),
    prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    prisma.supportConversation.count({ where: { status: 'OPEN' } }),
    prisma.supportConversation.count({ where: { status: 'WAITING_FOR_REPLY' } }),
    prisma.supportConversation.count({ where: { assignedAdminId: null, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    prisma.supportConversation.count({ where: { priority: 'URGENT', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    prisma.supportConversation.count({ where: { status: 'RESOLVED', resolvedAt: { gte: today } } }),
    prisma.supportConversation.count({ where: { createdAt: { gte: today } } }),
    prisma.supportConversation.count({ where: { createdAt: { gte: week } } }),
    prisma.supportConversation.findMany({ where: { createdAt: { gte: metricsSince } }, take: 1500, select: { createdAt: true, resolvedAt: true, messages: { select: { senderType: true, internal: true, createdAt: true }, orderBy: { createdAt: 'asc' } } } }),
  ]);
  const responseMinutes: number[] = []; const resolutionMinutes: number[] = [];
  for (const conversation of analyticsSample) {
    const firstCustomer = conversation.messages.find((m) => m.senderType === 'CUSTOMER');
    const firstReply = conversation.messages.find((m) => m.senderType === 'ADMIN' && !m.internal);
    if (firstCustomer && firstReply) responseMinutes.push((firstReply.createdAt.getTime() - firstCustomer.createdAt.getTime()) / 60000);
    if (conversation.resolvedAt) resolutionMinutes.push((conversation.resolvedAt.getTime() - conversation.createdAt.getTime()) / 60000);
  }
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  return ok({ conversations, admins, metrics: { open, waiting, unassigned, urgent, resolvedToday, today: todayCount, week: weekCount, averageResponseMinutes: average(responseMinutes), averageResolutionMinutes: average(resolutionMinutes) } });
}
