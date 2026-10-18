CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminNotificationRead" (
    "notificationId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminNotificationRead_pkey" PRIMARY KEY ("notificationId", "adminId")
);

CREATE UNIQUE INDEX "AdminNotification_dedupeKey_key" ON "AdminNotification"("dedupeKey");
CREATE INDEX "AdminNotification_section_createdAt_idx" ON "AdminNotification"("section", "createdAt");
CREATE INDEX "AdminNotification_entityType_entityId_idx" ON "AdminNotification"("entityType", "entityId");
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");
CREATE INDEX "AdminNotification_resolvedAt_idx" ON "AdminNotification"("resolvedAt");
CREATE INDEX "AdminNotificationRead_adminId_readAt_idx" ON "AdminNotificationRead"("adminId", "readAt");

ALTER TABLE "AdminNotificationRead" ADD CONSTRAINT "AdminNotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "AdminNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminNotificationRead" ADD CONSTRAINT "AdminNotificationRead_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the actionable state already visible through the old aggregate badges.
INSERT INTO "AdminNotification" ("id", "type", "section", "entityType", "entityId", "title", "message", "href", "dedupeKey", "createdAt")
SELECT 'comment-' || "id", 'COMMENT_MODERATION', 'comments', 'BlogComment', "id", 'Comment awaiting moderation', LEFT("body", 180), '/admin/comments?commentId=' || "id", 'comment:pending:' || "id", "createdAt"
FROM "BlogComment" WHERE "status" = 'PENDING';

INSERT INTO "AdminNotification" ("id", "type", "section", "entityType", "entityId", "title", "message", "href", "dedupeKey", "createdAt")
SELECT 'review-' || "id", 'REVIEW_MODERATION', 'reviews', 'Review', "id", 'Review awaiting approval', LEFT("review", 180), '/admin/reviews?reviewId=' || "id", 'review:pending:' || "id", "createdAt"
FROM "Review" WHERE "status" = 'PENDING';

INSERT INTO "AdminNotification" ("id", "type", "section", "entityType", "entityId", "title", "message", "href", "dedupeKey", "createdAt")
SELECT 'affiliate-' || "id", 'AFFILIATE_APPLICATION', 'affiliates', 'Affiliate', "id", 'New affiliate application', 'An affiliate application is awaiting review.', '/admin/affiliates?affiliateId=' || "id", 'affiliate:pending:' || "id", "createdAt"
FROM "Affiliate" WHERE "status" = 'PENDING';

INSERT INTO "AdminNotification" ("id", "type", "section", "entityType", "entityId", "title", "message", "href", "dedupeKey", "createdAt")
SELECT 'support-' || "id", 'SUPPORT_MESSAGE', 'support', 'SupportConversation', "id", 'Customer message', LEFT("lastMessagePreview", 180), '/admin/support?conversationId=' || "id", 'support:conversation:' || "id", "lastMessageAt"
FROM "SupportConversation" WHERE "adminUnreadCount" > 0 AND "status" <> 'CLOSED';
