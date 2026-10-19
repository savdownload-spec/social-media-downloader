ALTER TABLE "User"
ADD COLUMN "referralCredits" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CreditTransaction"
ADD COLUMN "referralDelta" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "referralBalanceAfter" INTEGER,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "referralId" TEXT;

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "rewardCredits" INTEGER NOT NULL DEFAULT 0,
    "remainingCredits" INTEGER NOT NULL DEFAULT 0,
    "expiredCredits" INTEGER NOT NULL DEFAULT 0,
    "estimatedUsdValue" DECIMAL(12,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifiedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditAllocation" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "spendTransactionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "refundedAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");
CREATE INDEX "Referral_affiliateId_createdAt_idx" ON "Referral"("affiliateId", "createdAt");
CREATE INDEX "Referral_affiliateId_status_createdAt_idx" ON "Referral"("affiliateId", "status", "createdAt");
CREATE INDEX "Referral_status_expiresAt_idx" ON "Referral"("status", "expiresAt");
CREATE UNIQUE INDEX "CreditTransaction_referralId_key" ON "CreditTransaction"("referralId");
CREATE UNIQUE INDEX "CreditAllocation_spendTransactionId_referralId_key" ON "CreditAllocation"("spendTransactionId", "referralId");
CREATE INDEX "CreditAllocation_referralId_createdAt_idx" ON "CreditAllocation"("referralId", "createdAt");

ALTER TABLE "Referral" ADD CONSTRAINT "Referral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditAllocation" ADD CONSTRAINT "CreditAllocation_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditAllocation" ADD CONSTRAINT "CreditAllocation_spendTransactionId_fkey" FOREIGN KEY ("spendTransactionId") REFERENCES "CreditTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
