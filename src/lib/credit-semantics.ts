export function allocateCreditDebit(planCredits: number, purchasedCredits: number, amount: number) {
  if (![planCredits, purchasedCredits, amount].every(Number.isInteger) || planCredits < 0 || purchasedCredits < 0 || amount <= 0) return null;
  if (planCredits + purchasedCredits < amount) return null;
  const fromPlan = Math.min(planCredits, amount);
  const fromPurchased = amount - fromPlan;
  return {
    fromPlan,
    fromPurchased,
    nextPlan: planCredits - fromPlan,
    nextPurchased: purchasedCredits - fromPurchased,
  };
}

/** Spend plan credits first, then expiring referral credits, then purchased credits. */
export function allocateCreditDebitWithReferral(
  planCredits: number,
  referralCredits: number,
  purchasedCredits: number,
  amount: number,
) {
  if (![planCredits, referralCredits, purchasedCredits, amount].every(Number.isInteger) ||
      planCredits < 0 || referralCredits < 0 || purchasedCredits < 0 || amount <= 0) return null;
  if (planCredits + referralCredits + purchasedCredits < amount) return null;

  const fromPlan = Math.min(planCredits, amount);
  const remainingAfterPlan = amount - fromPlan;
  const fromReferral = Math.min(referralCredits, remainingAfterPlan);
  const fromPurchased = remainingAfterPlan - fromReferral;
  return {
    fromPlan,
    fromReferral,
    fromPurchased,
    nextPlan: planCredits - fromPlan,
    nextReferral: referralCredits - fromReferral,
    nextPurchased: purchasedCredits - fromPurchased,
  };
}
