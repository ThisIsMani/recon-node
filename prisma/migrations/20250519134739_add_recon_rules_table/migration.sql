-- CreateTable
CREATE TABLE "ReconRule" (
    "id" TEXT NOT NULL,
    "account_one_id" TEXT NOT NULL,
    "account_two_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReconRule_account_one_id_idx" ON "ReconRule"("account_one_id");

-- CreateIndex
CREATE INDEX "ReconRule_account_two_id_idx" ON "ReconRule"("account_two_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReconRule_account_one_id_account_two_id_key" ON "ReconRule"("account_one_id", "account_two_id");

-- AddForeignKey
ALTER TABLE "ReconRule" ADD CONSTRAINT "ReconRule_account_one_id_fkey" FOREIGN KEY ("account_one_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconRule" ADD CONSTRAINT "ReconRule_account_two_id_fkey" FOREIGN KEY ("account_two_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;
