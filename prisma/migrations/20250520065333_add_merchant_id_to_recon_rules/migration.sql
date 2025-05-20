/*
  Warnings:

  - Added the required column `merchant_id` to the `ReconRule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ReconRule" ADD COLUMN     "merchant_id" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX "ReconRule_merchant_id_idx" ON "ReconRule"("merchant_id");

-- AddForeignKey
ALTER TABLE "ReconRule" ADD CONSTRAINT "ReconRule_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "MerchantAccount"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
