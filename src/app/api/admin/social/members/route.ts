import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { firstZodError, memberInputSchema } from '@/lib/social/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSocialApi(request, 'members');
  if (!auth.ok) return auth.response;

  const members = await prisma.socialMember.findMany({
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
  });

  return NextResponse.json(
    {
      ok: true,
      data: {
        members: members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt.toISOString(),
          user: member.user,
        })),
      },
    },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireSocialApi(request, 'members');
  if (!auth.ok) return auth.response;

  const json = await request.json().catch(() => null);
  const parsed = memberInputSchema.safeParse(json);
  if (!parsed.success) return socialError(firstZodError(parsed.error), 400);

  const user = await prisma.user.findFirst({
    where: { email: { equals: parsed.data.email, mode: 'insensitive' } },
    select: { id: true, email: true, role: true, name: true },
  });
  if (!user) {
    return socialError('No account uses that email. The person must sign in to GetSavDown once first.', 404);
  }
  if (user.role === 'ADMIN') {
    return socialError('That user is an administrator and already has full access.', 409);
  }

  const member = await prisma.socialMember.upsert({
    where: { userId: user.id },
    update: { role: parsed.data.role },
    create: { userId: user.id, role: parsed.data.role },
  });

  await writeAuditLog({
    adminId: auth.actor.id,
    adminEmail: auth.actor.email,
    action: 'social.member.set',
    targetType: 'User',
    targetId: user.id,
    detail: { role: member.role, email: user.email },
  });

  return NextResponse.json(
    {
      ok: true,
      data: {
        member: {
          id: member.id,
          userId: member.userId,
          role: member.role,
          user: { id: user.id, email: user.email, name: user.name },
        },
      },
    },
    { status: 201, headers: SOCIAL_NO_STORE_HEADERS },
  );
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSocialApi(request, 'members');
  if (!auth.ok) return auth.response;

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return socialError('Missing userId.', 400);

  const member = await prisma.socialMember.findUnique({ where: { userId } });
  if (!member) return socialError('Member not found.', 404);

  await prisma.socialMember.delete({ where: { userId } });
  await writeAuditLog({
    adminId: auth.actor.id,
    adminEmail: auth.actor.email,
    action: 'social.member.remove',
    targetType: 'User',
    targetId: userId,
    detail: { previousRole: member.role },
  });

  return NextResponse.json({ ok: true }, { headers: SOCIAL_NO_STORE_HEADERS });
}
