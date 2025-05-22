-- CreateEnum
CREATE TYPE "StagingEntryProcessingMode" AS ENUM ('CONFIRMATION', 'TRANSACTION');

-- AlterTable
ALTER TABLE "StagingEntry" ADD COLUMN     "processing_mode" "StagingEntryProcessingMode" NOT NULL DEFAULT 'CONFIRMATION';
