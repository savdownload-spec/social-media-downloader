-- Additive data-integrity migration. Existing ledger history is preserved.
ALTER TABLE "Download"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "batchId" TEXT,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "creditCost" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "Download"
SET "completedAt" = "createdAt"
WHERE "status" IN ('success', 'failed');

ALTER TABLE "CreditTransaction"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "operationId" TEXT,
  ADD COLUMN "paymentId" TEXT,
  ADD COLUMN "planDelta" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "purchasedDelta" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "balanceAfter" INTEGER,
  ADD COLUMN "planBalanceAfter" INTEGER,
  ADD COLUMN "purchasedBalanceAfter" INTEGER;

-- Bucket attribution is deterministic for legacy single-bucket rows. Mixed
-- historical spends remain unlinked rather than being guessed.
UPDATE "CreditTransaction"
SET "planDelta" = "amount"
WHERE "bucket" = 'plan';

UPDATE "CreditTransaction"
SET "purchasedDelta" = "amount"
WHERE "bucket" = 'purchased';

ALTER TABLE "AiImageGeneration"
  ADD COLUMN "operationId" TEXT;

CREATE UNIQUE INDEX "Download_idempotencyKey_key" ON "Download"("idempotencyKey");
CREATE INDEX "Download_status_createdAt_idx" ON "Download"("status", "createdAt");
CREATE INDEX "Download_userId_createdAt_idx" ON "Download"("userId", "createdAt");
CREATE INDEX "Download_batchId_idx" ON "Download"("batchId");
CREATE INDEX "Download_createdAt_idx" ON "Download"("createdAt");

CREATE UNIQUE INDEX "CreditTransaction_idempotencyKey_key" ON "CreditTransaction"("idempotencyKey");
CREATE INDEX "CreditTransaction_kind_createdAt_idx" ON "CreditTransaction"("kind", "createdAt");
CREATE INDEX "CreditTransaction_operationId_createdAt_idx" ON "CreditTransaction"("operationId", "createdAt");
CREATE INDEX "CreditTransaction_paymentId_idx" ON "CreditTransaction"("paymentId");
CREATE INDEX "CreditTransaction_createdAt_idx" ON "CreditTransaction"("createdAt");

CREATE UNIQUE INDEX "AiImageGeneration_operationId_key" ON "AiImageGeneration"("operationId");

ALTER TABLE "CreditTransaction"
  ADD CONSTRAINT "CreditTransaction_operationId_fkey"
  FOREIGN KEY ("operationId") REFERENCES "Download"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreditTransaction"
  ADD CONSTRAINT "CreditTransaction_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiImageGeneration"
  ADD CONSTRAINT "AiImageGeneration_operationId_fkey"
  FOREIGN KEY ("operationId") REFERENCES "Download"("id") ON DELETE SET NULL ON UPDATE CASCADE;
