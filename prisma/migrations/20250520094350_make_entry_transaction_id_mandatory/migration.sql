/*
  Warnings:

  - Made the column `transaction_id` on table `Entry` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Entry" DROP CONSTRAINT "Entry_transaction_id_fkey";

-- AlterTable
ALTER TABLE "Entry" ALTER COLUMN "transaction_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;
