/*
  Warnings:

  - Added the required column `amount` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MerchantAccount" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable - Add columns as nullable first
ALTER TABLE "Transaction" ADD COLUMN "amount" DECIMAL(20,4),
ADD COLUMN "currency" VARCHAR(3);

-- Update existing transactions with amount and currency from their entries
UPDATE "Transaction" t
SET 
  amount = COALESCE((
    SELECT ABS(e.amount)
    FROM "Entry" e
    WHERE e.transaction_id = t.transaction_id
    AND e.entry_type = 'DEBIT'
    LIMIT 1
  ), 0),
  currency = COALESCE((
    SELECT e.currency
    FROM "Entry" e
    WHERE e.transaction_id = t.transaction_id
    LIMIT 1
  ), 'USD');

-- Make columns non-nullable after populating data
ALTER TABLE "Transaction" 
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "currency" SET NOT NULL;