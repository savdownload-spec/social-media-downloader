-- Operations must never be assumed successful before processing completes.
ALTER TABLE "Download"
  ALTER COLUMN "status" SET DEFAULT 'pending',
  ADD COLUMN "failureCode" TEXT;

ALTER TABLE "Download"
  ADD CONSTRAINT "Download_status_check"
  CHECK ("status" IN ('pending', 'processing', 'success', 'failed', 'cancelled'));
