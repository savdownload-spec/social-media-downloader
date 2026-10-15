-- CreateTable
CREATE TABLE "AiImageGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "numberOfImages" INTEGER NOT NULL,
    "creditsUsed" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiImageGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiImageGeneration_userId_createdAt_idx" ON "AiImageGeneration"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiImageGeneration" ADD CONSTRAINT "AiImageGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
