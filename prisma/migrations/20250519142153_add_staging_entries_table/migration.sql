-- CreateEnum
CREATE TYPE "StagingEntryStatus" AS ENUM ('NEEDS_MANUAL_REVIEW', 'PROCESSED');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "StagingEntry" (
    "staging_entry_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "entry_type" "EntryType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "StagingEntryStatus" NOT NULL DEFAULT 'NEEDS_MANUAL_REVIEW',
    "effective_date" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "discarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StagingEntry_pkey" PRIMARY KEY ("staging_entry_id")
);

-- CreateIndex
CREATE INDEX "StagingEntry_account_id_idx" ON "StagingEntry"("account_id");

-- CreateIndex
CREATE INDEX "StagingEntry_status_idx" ON "StagingEntry"("status");

-- CreateIndex
CREATE INDEX "StagingEntry_effective_date_idx" ON "StagingEntry"("effective_date");

-- AddForeignKey
ALTER TABLE "StagingEntry" ADD CONSTRAINT "StagingEntry_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;
