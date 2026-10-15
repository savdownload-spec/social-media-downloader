-- Add passwordChangedAt to User for post-password-reset session invalidation.
-- NULL = no password change recorded; existing tokens remain valid.
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
