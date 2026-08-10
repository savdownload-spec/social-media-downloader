import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { accountUpdateSchema } from '@/lib/auth/validators';
import { verifyPassword, hashPassword } from '@/lib/passwords';
import { ok, fail } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in.', 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      jobTitle: true,
      company: true,
      bio: true,
      createdAt: true,
    },
  });

  if (!user) return fail('Account not found.', 404);

  return ok(user);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in.', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body.');
  }

  const parsed = accountUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const data = parsed.data;

  if (data.email) {
    const taken = await prisma.user.findUnique({ where: { email: data.email } });
    if (taken && taken.id !== userId) {
      return fail('An account with this email already exists.', 409);
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.image !== undefined) updateData.image = data.image;
  if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
  if (data.company !== undefined) updateData.company = data.company;
  if (data.bio !== undefined) updateData.bio = data.bio;

  if (data.newPassword && data.currentPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password || !(await verifyPassword(data.currentPassword, user.password))) {
      return fail('Your current password is incorrect.', 400);
    }
    updateData.password = await hashPassword(data.newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      jobTitle: true,
      company: true,
      bio: true,
      createdAt: true,
    },
  });

  return ok(updated);
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in.', 401);

  // Reviews cascade-delete with the user (Review.userId → onDelete: Cascade),
  // so no orphaned review data is left behind, and the user's reviews are
  // removed from public display.
  await prisma.user.delete({ where: { id: userId } });

  return ok({ message: 'Account deleted.' });
}
