-- Add per-plan batch file limit columns to ToolConfig.
-- All columns are nullable: NULL means "fall back to the code default in batchLimits.ts".
-- This is a purely additive migration — no data is changed.

ALTER TABLE "ToolConfig" ADD COLUMN "batchLimitFree"     INTEGER;
ALTER TABLE "ToolConfig" ADD COLUMN "batchLimitPro"      INTEGER;
ALTER TABLE "ToolConfig" ADD COLUMN "batchLimitMax"      INTEGER;
ALTER TABLE "ToolConfig" ADD COLUMN "batchLimitLifetime" INTEGER;
