-- These indexes were present in the legacy migration directory but were not
-- applied to the db-push-managed production database before it was baselined.
-- IF NOT EXISTS keeps this forward migration safe for equivalent databases
-- where db push may already have created them.
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expires_idx" ON "Session"("expires");
