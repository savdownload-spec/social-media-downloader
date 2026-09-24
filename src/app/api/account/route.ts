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
      accounts: { select: { provider: true }, take: 1 },
    },
  });

  if (!user) return fail('Account not found.', 404);

  const { accounts, ...rest } = user;
  return ok({ ...rest, oauthProvider: accounts[0]?.provider ?? null });
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
  // Only allow image URLs that come from our own storage:
  // Vercel Blob (public.blob.vercel-storage.com), or local-dev paths (/images/).
  // This prevents a user from PATCH-setting an arbitrary tracking/redirect URL
  // as their profile image by bypassing the avatar upload endpoint.
  if (data.image !== undefined) {
    if (data.image === null || data.image === '') {
      updateData.image = null;
    } else {
      const isVercelBlob = data.image.includes('blob.vercel-storage.com');
      const isLocalDev = data.image.startsWith('/images/avatars/');
      if (!isVercelBlob && !isLocalDev) {
        return fail('Profile pictures must be uploaded through the avatar upload endpoint.', 400);
      }
      updateData.image = data.image;
    }
  }
  if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
  if (data.company !== undefined) updateData.company = data.company;
  if (data.bio !== undefined) updateData.bio = data.bio;

  if (data.newPassword && data.currentPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password || !(await verifyPassword(data.currentPassword, user.password))) {
      return fail('Your current password is incorrect.', 400);
    }
    updateData.password = await hashPassword(data.newPassword);
    // Invalidate all existing sessions issued before this change.
    updateData.passwordChangedAt = new Date();
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

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in.', 401);

  // Require explicit re-confirmation before deleting. A stolen session token
  // alone must not be sufficient to delete the account.
  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }
  const { confirmPassword } = (body as { confirmPassword?: string }) ?? {};

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true, email: true, accounts: { select: { provider: true }, take: 1 } },
  });
  if (!user) return fail('Account not found.', 404);

  const isOAuthUser = user.accounts.length > 0 && !user.password;

  if (!confirmPassword?.trim()) {
    return fail(
      isOAuthUser ? 'Enter your email address to confirm deletion.' : 'Enter your password to confirm deletion.',
      400,
    );
  }

  if (isOAuthUser) {
    // OAuth users: require them to type their own email address.
    if (confirmPassword.trim().toLowerCase() !== (user.email ?? '').toLowerCase()) {
      return fail('The email address does not match your account.', 400);
    }
  } else {
    // Credentials users: require their current password.
    if (!user.password || !(await verifyPassword(confirmPassword, user.password))) {
      return fail('Your password is incorrect.', 400);
    }
  }

  // Reviews cascade-delete with the user (Review.userId → onDelete: Cascade),
  // so no orphaned review data is left behind, and the user's reviews are
  // removed from public display.
  await prisma.user.delete({ where: { id: userId } });

  return ok({ message: 'Account deleted.' });
}
