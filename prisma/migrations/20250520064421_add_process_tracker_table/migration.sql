-- CreateEnum
CREATE TYPE "ProcessTaskType" AS ENUM ('PROCESS_STAGING_ENTRY');

-- CreateEnum
CREATE TYPE "ProcessTaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY');

-- CreateTable
CREATE TABLE "ProcessTracker" (
    "task_id" TEXT NOT NULL,
    "task_type" "ProcessTaskType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ProcessTaskStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processing_started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ProcessTracker_pkey" PRIMARY KEY ("task_id")
);

-- CreateIndex
CREATE INDEX "ProcessTracker_status_idx" ON "ProcessTracker"("status");

-- CreateIndex
CREATE INDEX "ProcessTracker_task_type_idx" ON "ProcessTracker"("task_type");

-- CreateIndex
CREATE INDEX "ProcessTracker_created_at_idx" ON "ProcessTracker"("created_at");
