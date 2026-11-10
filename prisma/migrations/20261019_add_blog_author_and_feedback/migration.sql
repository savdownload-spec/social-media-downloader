-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "authorId" TEXT;

-- CreateTable
CREATE TABLE "BlogAuthor" (
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

-- CreateTable
CREATE TABLE "ArticleFeedback" (
    "id" TEXT NOT NULL,
    "postSlug" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArticleFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogAuthor_slug_key" ON "BlogAuthor"("slug");

-- CreateIndex
CREATE INDEX "BlogAuthor_slug_idx" ON "BlogAuthor"("slug");

-- CreateIndex
CREATE INDEX "ArticleFeedback_postSlug_helpful_idx" ON "ArticleFeedback"("postSlug", "helpful");

-- CreateIndex
CREATE INDEX "ArticleFeedback_createdAt_idx" ON "ArticleFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "BlogAuthor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
