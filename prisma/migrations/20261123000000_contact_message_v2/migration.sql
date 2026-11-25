-- contact_message_v2: add status, email tracking, idempotency, and updatedAt
-- to ContactMessage. Uses ADD COLUMN IF NOT EXISTS throughout so the migration
-- is safe to re-run if a column was already added by a manual hotfix.
-- Timestamp set to 20261123 (day after the last migration) so it sorts
-- correctly after 20261122_backup_runs in Prisma's lexicographic ordering.

ALTER TABLE "ContactMessage"
  ADD COLUMN IF NOT EXISTS "status"                TEXT         NOT NULL DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS "emailNotificationSent" BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emailDeliveryFailed"   BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "idempotencyKey"        TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Unique constraint on idempotencyKey (NULLs do not collide in PostgreSQL).
-- IF NOT EXISTS guard prevents failure on re-run.
CREATE UNIQUE INDEX IF NOT EXISTS "ContactMessage_idempotencyKey_key"
  ON "ContactMessage"("idempotencyKey");

-- Query indexes matching the Prisma schema @@index declarations.
CREATE INDEX IF NOT EXISTS "ContactMessage_status_createdAt_idx"
  ON "ContactMessage"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "ContactMessage_createdAt_idx"
  ON "ContactMessage"("createdAt");
