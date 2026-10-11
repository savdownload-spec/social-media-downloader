import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getClientId, ratelimit } from '@/lib/ratelimit';

export async function requireAdminApi(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false as const, response: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }) };

  // Re-read role for every API call; JWT role claims can be stale after demotion.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (user?.role !== 'ADMIN') return { ok: false as const, response: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }) };

  const limit = await ratelimit(`admin-analytics:${userId}:${getClientId(request)}`, { limit: 120, windowSeconds: 60 });
  if (!limit.success) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: 'Too many admin analytics requests.' },
        { status: 429, headers: { 'Retry-After': String(limit.resetSeconds) } },
      ),
    };
  }
  return { ok: true as const, user };
}

export const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
};
