import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in.', 401);

  const reviews = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      review: true,
      role: true,
      company: true,
      platform: true,
      status: true,
      featured: true,
      createdAt: true,
      updatedAt: true,
      approvedAt: true,
    },
  });

  return ok({ reviews });
}
