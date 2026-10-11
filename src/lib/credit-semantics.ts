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
