/*
  Warnings:

  - Added the required column `merchant_id` to the `ReconRule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Step 1: Add the column as nullable
ALTER TABLE "ReconRule" ADD COLUMN     "merchant_id" VARCHAR(255);

-- Step 2: Backfill the column with default values (e.g., a placeholder or derived value)
UPDATE "ReconRule" SET "merchant_id" = '<default_value>' WHERE "merchant_id" IS NULL;

-- Step 3: Alter the column to make it NOT NULL
ALTER TABLE "ReconRule" ALTER COLUMN "merchant_id" SET NOT NULL;
-- CreateIndex
CREATE INDEX "ReconRule_merchant_id_idx" ON "ReconRule"("merchant_id");

-- AddForeignKey
ALTER TABLE "ReconRule" ADD CONSTRAINT "ReconRule_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "MerchantAccount"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
