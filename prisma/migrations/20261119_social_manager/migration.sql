-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "username" TEXT,
    "avatarUrl" TEXT,
    "accountType" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "metadata" JSONB,
    "lastConnectedAt" TIMESTAMP(3),
    "lastPublishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMediaAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'BLOB',
    "kind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" DOUBLE PRECISION,
    "altText" TEXT,
    "name" TEXT NOT NULL,
    "checksum" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SocialMediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT NOT NULL DEFAULT '',
    "hashtags" TEXT,
    "linkUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostVariant" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountId" TEXT,
    "caption" TEXT NOT NULL DEFAULT '',
    "title" TEXT,
    "hashtags" TEXT,
    "linkUrl" TEXT,
    "options" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remotePostId" TEXT,
    "publishedUrl" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPostVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostMedia" (
    "postId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocialPostMedia_pkey" PRIMARY KEY ("postId","assetId")
);

-- CreateTable
CREATE TABLE "PublishingJob" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimedBy" TEXT,
    "claimedAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishingAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "variantId" TEXT,
    "accountId" TEXT,
    "platform" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "httpStatus" INTEGER,
    "outcome" TEXT NOT NULL,
    "errorCode" TEXT,
    "message" TEXT,
    "providerResponse" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "PublishingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialOAuthState" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "verifier" TEXT,
    "redirectTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "platform" TEXT NOT NULL,
    "variantId" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metrics" JSONB NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "SocialAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialAccount_platform_status_idx" ON "SocialAccount"("platform", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_platform_externalAccountId_key" ON "SocialAccount"("platform", "externalAccountId");

-- CreateIndex
CREATE INDEX "SocialMediaAsset_kind_createdAt_idx" ON "SocialMediaAsset"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "SocialMediaAsset_deletedAt_idx" ON "SocialMediaAsset"("deletedAt");

-- CreateIndex
CREATE INDEX "SocialPost_status_scheduledAt_idx" ON "SocialPost"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "SocialPost_updatedAt_idx" ON "SocialPost"("updatedAt");

-- CreateIndex
CREATE INDEX "SocialPostVariant_status_idx" ON "SocialPostVariant"("status");

-- CreateIndex
CREATE INDEX "SocialPostVariant_accountId_idx" ON "SocialPostVariant"("accountId");

-- CreateIndex
CREATE INDEX "SocialPostVariant_postId_idx" ON "SocialPostVariant"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPostVariant_postId_platform_accountId_key" ON "SocialPostVariant"("postId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "SocialPostMedia_assetId_idx" ON "SocialPostMedia"("assetId");

-- CreateIndex
CREATE INDEX "PublishingJob_status_runAt_idx" ON "PublishingJob"("status", "runAt");

-- CreateIndex
CREATE INDEX "PublishingJob_postId_idx" ON "PublishingJob"("postId");

-- CreateIndex
CREATE INDEX "PublishingAttempt_platform_startedAt_idx" ON "PublishingAttempt"("platform", "startedAt");

-- CreateIndex
CREATE INDEX "PublishingAttempt_variantId_idx" ON "PublishingAttempt"("variantId");

-- CreateIndex
CREATE INDEX "PublishingAttempt_jobId_idx" ON "PublishingAttempt"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialOAuthState_stateHash_key" ON "SocialOAuthState"("stateHash");

-- CreateIndex
CREATE INDEX "SocialOAuthState_expiresAt_idx" ON "SocialOAuthState"("expiresAt");

-- CreateIndex
CREATE INDEX "SocialOAuthState_adminId_idx" ON "SocialOAuthState"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMember_userId_key" ON "SocialMember"("userId");

-- CreateIndex
CREATE INDEX "SocialMember_role_idx" ON "SocialMember"("role");

-- CreateIndex
CREATE INDEX "SocialTemplate_category_idx" ON "SocialTemplate"("category");

-- CreateIndex
CREATE INDEX "SocialAnalyticsSnapshot_platform_capturedAt_idx" ON "SocialAnalyticsSnapshot"("platform", "capturedAt");

-- CreateIndex
CREATE INDEX "SocialAnalyticsSnapshot_accountId_capturedAt_idx" ON "SocialAnalyticsSnapshot"("accountId", "capturedAt");

-- AddForeignKey
ALTER TABLE "SocialPostVariant" ADD CONSTRAINT "SocialPostVariant_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostVariant" ADD CONSTRAINT "SocialPostVariant_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostMedia" ADD CONSTRAINT "SocialPostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostMedia" ADD CONSTRAINT "SocialPostMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "SocialMediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishingJob" ADD CONSTRAINT "PublishingJob_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishingAttempt" ADD CONSTRAINT "PublishingAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PublishingJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishingAttempt" ADD CONSTRAINT "PublishingAttempt_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SocialPostVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishingAttempt" ADD CONSTRAINT "PublishingAttempt_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMember" ADD CONSTRAINT "SocialMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

