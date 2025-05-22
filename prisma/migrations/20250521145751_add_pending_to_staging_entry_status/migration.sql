/*
  Warnings:

  - The values [ARCHIVED] on the enum `StagingEntryStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StagingEntryStatus_new" AS ENUM ('PENDING', 'NEEDS_MANUAL_REVIEW', 'PROCESSED');
ALTER TABLE "StagingEntry" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "StagingEntry" ALTER COLUMN "status" TYPE "StagingEntryStatus_new" USING ("status"::text::"StagingEntryStatus_new");
ALTER TYPE "StagingEntryStatus" RENAME TO "StagingEntryStatus_old";
ALTER TYPE "StagingEntryStatus_new" RENAME TO "StagingEntryStatus";
DROP TYPE "StagingEntryStatus_old";
ALTER TABLE "StagingEntry" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "StagingEntry" ALTER COLUMN "status" SET DEFAULT 'PENDING';
