import { prisma } from '@/lib/prisma';
import { spendCredits } from '@/lib/credits';

export type AiCreditReservation = {
  amount: number;
  planCredits: number;
  purchasedCredits: number;
};

export async function reserveAiCredits(userId: string, amount: number): Promise<AiCreditReservation | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { planCredits: true, purchasedCredits: true } });
  if (!user) return null;
  const planCredits = Math.min(user.planCredits, amount);
  const purchasedCredits = amount - planCredits;
  const reserved = await spendCredits(userId, amount, 'AI image generation reservation');
  return reserved ? { amount, planCredits, purchasedCredits } : null;
}

export async function releaseAiCredits(userId: string, reservation: AiCreditReservation, reason: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { planCredits: { increment: reservation.planCredits }, purchasedCredits: { increment: reservation.purchasedCredits } } }),
    prisma.creditTransaction.create({ data: { userId, amount: reservation.amount, kind: 'refund', bucket: reservation.planCredits > 0 ? 'plan' : 'purchased', description: reason } }),
  ]);
}
