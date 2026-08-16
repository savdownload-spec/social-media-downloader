ALTER TABLE "SupportMessage"
  ADD COLUMN "originalMessage" TEXT,
  ADD COLUMN "detectedLanguage" TEXT,
  ADD COLUMN "translatedMessage" TEXT,
  ADD COLUMN "translationStatus" TEXT;

UPDATE "SupportMessage"
SET "originalMessage" = "body",
    "translationStatus" = CASE WHEN "senderType" = 'CUSTOMER' THEN 'PENDING' ELSE 'NOT_NEEDED' END
WHERE "originalMessage" IS NULL;
