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

async function loadActor(): Promise<SocialActor | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;

  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    }),
    prisma.socialMember.findUnique({ where: { userId }, select: { role: true } }),
  ]);
  if (!user) return null;

  const role: SocialRole | null =
    user.role === 'ADMIN'
      ? 'SUPER_ADMIN'
      : membership && isSocialRole(membership.role)
        ? membership.role
        : null;

  if (!role) return null;
  return { id: user.id, email: user.email ?? 'admin', name: user.name, role };
}

/** Session-only actor resolution (no capability or rate-limit gate). */
export async function resolveSocialActor(request: Request): Promise<SocialActor | null> {
  if (!sameOrigin(request)) return null;
  return loadActor();
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

  const actor = await loadActor();
  if (!actor) return reject(403, 'Forbidden');

  if (!roleCan(actor.role, capability)) {
    return reject(403, 'Your social role does not allow this action.');
  }

  const limit = await ratelimit(`social:${capability}:${actor.id}:${getClientId(request)}`, {
    limit: 120,
    windowSeconds: 60,
  });
  if (!limit.success) {
    return reject(429, 'Too many requests. Try again shortly.', {
      'Retry-After': String(limit.resetSeconds),
    });
  }

  return { ok: true, actor };
}

export function socialError(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: SOCIAL_NO_STORE_HEADERS },
  );
}
