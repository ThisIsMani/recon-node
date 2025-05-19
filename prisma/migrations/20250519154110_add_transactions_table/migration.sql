-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('EXPECTED', 'POSTED', 'MISMATCH', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" TEXT NOT NULL,
    "logical_transaction_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "merchant_id" VARCHAR(255) NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "discarded_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateIndex
CREATE INDEX "Transaction_logical_transaction_id_idx" ON "Transaction"("logical_transaction_id");

-- CreateIndex
CREATE INDEX "Transaction_merchant_id_idx" ON "Transaction"("merchant_id");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_logical_transaction_id_version_key" ON "Transaction"("logical_transaction_id", "version");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "MerchantAccount"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
