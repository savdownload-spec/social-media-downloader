import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getClientId, ratelimit } from '@/lib/ratelimit';
import { isSocialRole, roleCan, type SocialCapability, type SocialRole } from './permissions';

export type SocialActor = {
  id: string;
  email: string;
  name: string | null;
  role: SocialRole;
};

export const SOCIAL_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
};

function reject(status: number, error: string, extra: Record<string, string> = {}) {
  return {
    ok: false as const,
    response: NextResponse.json(
      { ok: false, error },
      { status, headers: { ...SOCIAL_NO_STORE_HEADERS, ...extra } },
    ),
  };
}

function sameOrigin(request: Request): boolean {
  if (request.method === 'GET' || request.method === 'HEAD') return true;
  const origin = request.headers.get('origin');
  if (!origin) return true; // server-to-server / cron; cookies are SameSite-protected
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/**
 * Server-side gate for every Social Media Manager API. The DB role is re-read
 * on each call (never trusted from the JWT) and module membership is resolved
 * separately from the global role.
 */
export async function requireSocialApi(
  request: Request,
  capability: SocialCapability,
): Promise<{ ok: true; actor: SocialActor } | { ok: false; response: NextResponse }> {
  if (!sameOrigin(request)) return reject(403, 'Invalid request origin.');

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return reject(401, 'Sign in required.');

  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    }),
    prisma.socialMember.findUnique({ where: { userId }, select: { role: true } }),
  ]);
  if (!user) return reject(403, 'Forbidden');

  const role: SocialRole | null =
    user.role === 'ADMIN'
      ? 'SUPER_ADMIN'
      : membership && isSocialRole(membership.role)
        ? membership.role
        : null;

  if (!role || !roleCan(role, capability)) {
    return reject(403, role ? 'Your social role does not allow this action.' : 'Forbidden');
  }

  const limit = await ratelimit(`social:${capability}:${userId}:${getClientId(request)}`, {
    limit: 120,
    windowSeconds: 60,
  });
  if (!limit.success) {
    return reject(429, 'Too many requests. Try again shortly.', {
      'Retry-After': String(limit.resetSeconds),
    });
  }

  return {
    ok: true,
    actor: { id: user.id, email: user.email ?? 'admin', name: user.name, role },
  };
}

export function socialError(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: SOCIAL_NO_STORE_HEADERS },
  );
}
