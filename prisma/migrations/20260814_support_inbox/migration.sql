-- Persistent human support inbox. Attachments are deliberately stored as small
-- bytea blobs so Vercel/serverless deployments do not rely on local disk.
CREATE TABLE "SupportConversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "guestName" TEXT,
  "guestEmail" TEXT,
  "guestTokenHash" TEXT,
  "category" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "assignedAdminId" TEXT,
  "lastMessagePreview" TEXT NOT NULL DEFAULT '',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customerUnreadCount" INTEGER NOT NULL DEFAULT 0,
  "adminUnreadCount" INTEGER NOT NULL DEFAULT 0,
  "customerLastReadAt" TIMESTAMP(3),
  "adminLastReadAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL, "conversationId" TEXT NOT NULL, "senderType" TEXT NOT NULL,
  "senderId" TEXT, "body" TEXT NOT NULL, "internal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupportAttachment" (
  "id" TEXT NOT NULL, "messageId" TEXT NOT NULL, "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL, "size" INTEGER NOT NULL, "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportConversation_userId_lastMessageAt_idx" ON "SupportConversation"("userId", "lastMessageAt");
CREATE INDEX "SupportConversation_guestEmail_lastMessageAt_idx" ON "SupportConversation"("guestEmail", "lastMessageAt");
CREATE INDEX "SupportConversation_status_lastMessageAt_idx" ON "SupportConversation"("status", "lastMessageAt");
CREATE INDEX "SupportConversation_assignedAdminId_status_lastMessageAt_idx" ON "SupportConversation"("assignedAdminId", "status", "lastMessageAt");
CREATE INDEX "SupportConversation_priority_status_idx" ON "SupportConversation"("priority", "status");
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage"("conversationId", "createdAt");
CREATE INDEX "SupportAttachment_messageId_idx" ON "SupportAttachment"("messageId");
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
