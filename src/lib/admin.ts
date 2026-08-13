import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/** Write an audit log entry. Fire-and-forget — never throws. */
export async function writeAuditLog({
  adminId,
  adminEmail,
  action,
  targetType,
  targetId,
  detail,
  ip,
}: {
  adminId: string;
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId, adminEmail, action, targetType, targetId, ip,
        detail: detail as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // audit failures must never break the main action
  }
}

/** Verify the session has ADMIN role; returns { ok, role } */
export function isAdmin(role?: string) {
  return role === 'ADMIN';
}

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
