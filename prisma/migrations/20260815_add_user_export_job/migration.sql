-- CreateTable
CREATE TABLE "UserExportJob" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "scope" TEXT NOT NULL,
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "dateField" TEXT,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "fieldsJson" JSONB NOT NULL,
    "formatsJson" JSONB NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "filesJson" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserExportJob_adminId_createdAt_idx" ON "UserExportJob"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "UserExportJob_status_expiresAt_idx" ON "UserExportJob"("status", "expiresAt");
