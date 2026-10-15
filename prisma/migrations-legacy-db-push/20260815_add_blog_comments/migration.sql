-- Blog comments use the existing User identity model and keep editorial posts
-- addressable by their stable public slug, covering both static and CMS posts.
CREATE TABLE "BlogComment" (
  "id" TEXT NOT NULL,
  "postSlug" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reportReason" TEXT,
  "reportedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "moderatedAt" TIMESTAMP(3),
  "moderatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BlogComment_postSlug_status_createdAt_idx" ON "BlogComment"("postSlug", "status", "createdAt");
CREATE INDEX "BlogComment_status_reportedAt_idx" ON "BlogComment"("status", "reportedAt");
CREATE INDEX "BlogComment_userId_createdAt_idx" ON "BlogComment"("userId", "createdAt");

ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;