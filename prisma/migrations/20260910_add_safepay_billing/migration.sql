-- Safepay provider additions. Existing Stripe columns and tables are intentionally preserved.
ALTER TABLE "User" ADD COLUMN "safepayCustomerId" TEXT;
CREATE UNIQUE INDEX "User_safepayCustomerId_key" ON "User"("safepayCustomerId");

ALTER TABLE "Subscription" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "Subscription" ADD COLUMN "safepaySubscriptionId" TEXT;
CREATE UNIQUE INDEX "Subscription_safepaySubscriptionId_key" ON "Subscription"("safepaySubscriptionId");
CREATE INDEX "Subscription_provider_status_idx" ON "Subscription"("provider", "status");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerPaymentId" TEXT NOT NULL,
  "userId" TEXT,
  "itemId" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reference" TEXT,
  "subscriptionId" TEXT,
  "metadata" JSONB,
  "paidAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProcessedSafepayEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedSafepayEvent_pkey" PRIMARY KEY ("id")
);
