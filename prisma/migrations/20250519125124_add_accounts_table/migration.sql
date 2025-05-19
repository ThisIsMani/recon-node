-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('DEBIT_NORMAL', 'CREDIT_NORMAL');

-- CreateTable
CREATE TABLE "Account" (
    "account_id" TEXT NOT NULL,
    "merchant_id" VARCHAR(255) NOT NULL,
    "account_name" VARCHAR(255) NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("account_id")
);

-- CreateIndex
CREATE INDEX "Account_merchant_id_idx" ON "Account"("merchant_id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "MerchantAccount"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
