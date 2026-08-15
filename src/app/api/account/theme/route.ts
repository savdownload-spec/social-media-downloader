import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { themePatchSchema } from '@/lib/theme/validators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Kept separate from /api/account + accountUpdateSchema: this is a cheap,
// frequent, single-field update unrelated to the larger profile payload.

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in.', 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { themePreference: true },
  });

  return ok({ mode: user?.themePreference ?? null });
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

  const parsed = themePatchSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input.');

  await prisma.user.update({
    where: { id: userId },
    data: { themePreference: parsed.data.mode },
  });

  return ok({ mode: parsed.data.mode });
}
