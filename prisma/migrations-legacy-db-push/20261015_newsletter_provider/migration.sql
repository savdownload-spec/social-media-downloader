BEGIN;
LOCK TABLE "NewsletterSubscriber" IN ACCESS EXCLUSIVE MODE;
ALTER TABLE "NewsletterSubscriber"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'homepage-monthly-update',
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerSubscriberId" TEXT,
  ADD COLUMN "providerListId" TEXT,
  ADD COLUMN "subscribedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Retain earliest identity/date and preserve any legacy opt-out when merging.
WITH grouped AS (
  SELECT lower(btrim(email)) AS email, bool_and(active) AS active
  FROM "NewsletterSubscriber" GROUP BY lower(btrim(email))
)
UPDATE "NewsletterSubscriber" n SET active = g.active
FROM grouped g WHERE lower(btrim(n.email)) = g.email;
DELETE FROM "NewsletterSubscriber" n USING "NewsletterSubscriber" keep
WHERE lower(btrim(n.email)) = lower(btrim(keep.email))
  AND (n."createdAt", n.id) > (keep."createdAt", keep.id);
UPDATE "NewsletterSubscriber" SET email = lower(btrim(email)),
  status = CASE WHEN active THEN 'legacy' ELSE 'unsubscribed' END;
-- Local-only signups have not yet been accepted by the delivery provider.
UPDATE "NewsletterSubscriber" SET active = false WHERE status = 'legacy';
ALTER TABLE "NewsletterSubscriber" ALTER COLUMN active SET DEFAULT false;
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_email_normalized"
  CHECK (email = lower(btrim(email)));
COMMIT;
