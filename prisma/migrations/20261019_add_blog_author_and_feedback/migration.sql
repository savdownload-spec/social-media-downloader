-- AlterTable: add authorId column to Post (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Post' AND column_name = 'authorId'
  ) THEN
    ALTER TABLE "Post" ADD COLUMN "authorId" TEXT;
  END IF;
END $$;

-- CreateTable: BlogAuthor (idempotent)
CREATE TABLE IF NOT EXISTS "BlogAuthor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "profileImage" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Author',
    "shortBio" TEXT,
    "extendedBio" TEXT,
    "expertiseJson" TEXT NOT NULL DEFAULT '[]',
    "website" TEXT,
    "socialsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BlogAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ArticleFeedback (idempotent)
CREATE TABLE IF NOT EXISTS "ArticleFeedback" (
    "id" TEXT NOT NULL,
    "postSlug" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArticleFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "BlogAuthor_slug_key" ON "BlogAuthor"("slug");
CREATE INDEX IF NOT EXISTS "BlogAuthor_slug_idx" ON "BlogAuthor"("slug");
CREATE INDEX IF NOT EXISTS "ArticleFeedback_postSlug_helpful_idx" ON "ArticleFeedback"("postSlug", "helpful");
CREATE INDEX IF NOT EXISTS "ArticleFeedback_createdAt_idx" ON "ArticleFeedback"("createdAt");
CREATE INDEX IF NOT EXISTS "Post_authorId_idx" ON "Post"("authorId");

-- AddForeignKey: Post -> BlogAuthor (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Post_authorId_fkey'
      AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
  ) THEN
    ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "BlogAuthor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
