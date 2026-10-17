import {
  refundCreditSpend,
  spendCreditsDetailed,
  type CreditSpend,
  type ToolOperationInput,
} from '@/lib/credits';

export type AiCreditReservation = CreditSpend;

/** Reserve and link credits to one canonical generation operation. */
export function reserveAiCredits(
  userId: string,
  amount: number,
  operation: ToolOperationInput,
): Promise<AiCreditReservation | null> {
  return spendCreditsDetailed(userId, amount, operation, 'pending');
}

/** Exactly one refund can be created for a reservation, even on retries. */
export function releaseAiCredits(userId: string, reservation: AiCreditReservation, reason: string, failureCode?: string) {
  return refundCreditSpend(userId, reservation.transactionId, reason, true, failureCode);
}
