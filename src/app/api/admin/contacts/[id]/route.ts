import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { writeAuditLog } from '@/lib/admin';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; email?: string; role?: string } | undefined;
  if (admin?.role !== 'ADMIN' || !admin.id) {
    return fail('Forbidden.', 403);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail('Invalid JSON.', 400);
  }

  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'Invalid input.', 400);
  }

  const { status } = parsed.data;

  try {
    const updated = await prisma.contactMessage.update({
      where: { id: params.id },
      data: { status },
    });

    await writeAuditLog({
      adminId: admin.id,
      adminEmail: admin.email ?? '',
      action: 'contact.update',
      targetType: 'ContactMessage',
      targetId: params.id,
      detail: { status },
    });

    return ok(updated);
  } catch {
    return fail('Contact message not found.', 404);
  }
}
