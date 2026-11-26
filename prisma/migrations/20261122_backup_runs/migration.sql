-- CreateTable
CREATE TABLE "BackupRun" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dateKey" TEXT,
    "status" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "backupId" TEXT,
    "fileName" TEXT,
    "size" INTEGER,
    "sha256" TEXT,
    "recordCounts" JSONB,
    "fileCount" INTEGER,
    "warnings" JSONB,
    "error" TEXT,
    "createdBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BackupRun_backupId_key" ON "BackupRun"("backupId");

-- CreateIndex
CREATE UNIQUE INDEX "BackupRun_kind_dateKey_key" ON "BackupRun"("kind", "dateKey");

-- CreateIndex
CREATE INDEX "BackupRun_status_startedAt_idx" ON "BackupRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "BackupRun_startedAt_idx" ON "BackupRun"("startedAt");
