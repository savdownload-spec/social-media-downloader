-- AddIndex: Account.userId
-- Speeds up cascading deletes and account lookups by userId
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

-- AddIndex: Session.userId
-- Speeds up cascading deletes and session listing by userId
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- AddIndex: Session.expires
-- Used by NextAuth cleanup of expired sessions
CREATE INDEX IF NOT EXISTS "Session_expires_idx" ON "Session"("expires");
