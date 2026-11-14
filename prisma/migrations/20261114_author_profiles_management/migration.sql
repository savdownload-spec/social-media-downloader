-- Extend BlogAuthor for public directory/profile management.
-- Idempotent because this project historically used `prisma db push` and the
-- deploy script reconciles legacy migrations before running `migrate deploy`.

ALTER TABLE "BlogAuthor" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "BlogAuthor" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "BlogAuthor" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "BlogAuthor_published_idx" ON "BlogAuthor"("published");

-- Preserve old profile URLs after a slug rename.
CREATE TABLE IF NOT EXISTS "AuthorSlugRedirect" (
    "oldSlug" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthorSlugRedirect_pkey" PRIMARY KEY ("oldSlug")
);

CREATE INDEX IF NOT EXISTS "AuthorSlugRedirect_authorId_idx" ON "AuthorSlugRedirect"("authorId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AuthorSlugRedirect_authorId_fkey'
      AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
  ) THEN
    ALTER TABLE "AuthorSlugRedirect" ADD CONSTRAINT "AuthorSlugRedirect_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "BlogAuthor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
