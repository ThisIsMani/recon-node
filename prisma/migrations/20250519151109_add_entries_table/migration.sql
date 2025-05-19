-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('EXPECTED', 'POSTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Entry" (
    "entry_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "entry_type" "EntryType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "discarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("entry_id")
);

-- CreateIndex
CREATE INDEX "Entry_account_id_idx" ON "Entry"("account_id");

-- CreateIndex
CREATE INDEX "Entry_transaction_id_idx" ON "Entry"("transaction_id");

-- CreateIndex
CREATE INDEX "Entry_status_idx" ON "Entry"("status");

-- CreateIndex
CREATE INDEX "Entry_effective_date_idx" ON "Entry"("effective_date");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;
