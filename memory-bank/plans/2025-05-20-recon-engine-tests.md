# Test Plan: Recon Engine - Phase 1

This document outlines the test strategy for the initial phase of the Recon Engine, covering the Process Tracker, Producer, and Consumer components.

## I. Unit Tests

### 1. Process Tracker Core Logic (`src/server/core/process-tracker/index.js`)
   - **`createTask(task_type, payload)`:**
     - Test successful task creation with valid `task_type` and `payload`.
     - Test that `status` defaults to `PENDING` and `attempts` to `0`.
     - Test that it throws an error for an invalid `task_type`.
   - **`getNextPendingTask(task_type)`:**
     - Test fetching a `PENDING` task when one exists.
     - Test fetching a `RETRY` task when one exists and no `PENDING` tasks of that type exist.
     - Test that it returns the oldest task first (by `created_at`).
     - Test that it returns `null` when no suitable tasks are found.
     - Test that it throws an error for an invalid `task_type`.
   - **`updateTaskStatus(task_id, new_status, details = {})`:**
     - Test updating status to `PROCESSING` (sets `processing_started_at`, increments `attempts` if `increment_attempt` is true).
     - Test updating status to `COMPLETED` (sets `completed_at`, clears `last_error`).
     - Test updating status to `FAILED` (sets `completed_at`, sets `last_error`, increments `attempts`).
     - Test updating status to `RETRY` (sets `last_error`, increments `attempts`).
     - Test that it throws an error for an invalid `new_status`.
     - Test updating a non-existent `task_id`.

### 2. Producer Logic (`src/server/core/staging-entry/index.js`)
   - **`createStagingEntry(account_id, entryData)`:**
     - Mock `processTrackerCore.createTask`.
     - Test that `createTask` is called with correct `task_type` (`PROCESS_STAGING_ENTRY`) and `payload` (containing `staging_entry_id`) after successful `StagingEntry` creation.
     - Test that `StagingEntry` creation succeeds even if `createTask` throws an error (and the error is logged).

### 3. Consumer Logic (`src/server/core/recon-engine/consumer.js`)
   - **`processSingleTask()` (mocking dependencies):**
     - Mock `processTrackerCore.getNextPendingTask` to return a task.
     - Mock `processTrackerCore.updateTaskStatus`.
     - Mock `prisma.stagingEntry.findUnique` to return a staging entry.
     - Mock `transactionCore.createTransactionInternal` to simulate successful transaction/entry creation.
     - Mock `prisma.stagingEntry.update` for marking as processed.
     - **Success Case:**
       - Verify `updateTaskStatus` is called for `PROCESSING`.
       - Verify `stagingEntry.findUnique` is called with correct ID.
       - Verify `createTransactionInternal` is called with correctly transformed data.
       - Verify `stagingEntry.update` is called to set status to `PROCESSED`.
       - Verify `updateTaskStatus` is called for `COMPLETED`.
     - **Error Cases:**
       - Task payload missing `staging_entry_id`.
       - `StagingEntry` not found.
       - `createTransactionInternal` throws an error.
       - `stagingEntry.update` throws an error.
       - Verify appropriate calls to `updateTaskStatus` for `FAILED` status and error logging.
       - Verify retry logic (e.g., task attempts leading to permanent FAILED status).
     - **No Task Case:**
       - `getNextPendingTask` returns `null`. Verify no further processing occurs.

### 4. Internal Data Creation Functions
   - **`transactionCore.createTransactionInternal(transactionShellData, entriesData)`:**
     - Mock `entryCore.createEntryInternal`.
     - Test successful creation of transaction shell and associated entries.
     - Test that `createEntryInternal` is called correctly for each entry in `entriesData` with the new `transaction_id`.
     - Test error handling (e.g., invalid `status`, non-existent `merchant_id`).
     - Test with empty `entriesData`.
   - **`entryCore.createEntryInternal(entryData)`:**
     - Test successful entry creation.
     - Test error handling (e.g., invalid `entry_type`, `status`, non-existent `account_id`, non-existent `transaction_id` if provided).

## II. Integration Tests

### 1. Producer -> Process Tracker -> Consumer (End-to-End for one Staging Entry)
   - **Setup:** Start with an empty `ProcessTracker` and relevant `Account`.
   - **Action:**
     1. Call API to create a `StagingEntry` (this is the trigger).
   - **Verification (after a short delay for consumer to run, or by manually triggering consumer cycle):**
     - A task was created in `ProcessTracker` with `PENDING` status.
     - The task status changed to `PROCESSING`, then `COMPLETED`.
     - A new `Transaction` record was created.
     - A new `Entry` record was created, linked to the new `Transaction` and the original `Account`.
     - The original `StagingEntry` status was updated to `PROCESSED`.
     - Data in `Transaction` and `Entry` matches transformed data from `StagingEntry`.

### 2. Consumer Error Handling and Retries
   - **Setup:** Create a task in `ProcessTracker` manually (or via producer).
   - **Action & Verification:**
     - Configure a scenario where processing will fail (e.g., mock a DB error during entry creation).
     - Run consumer.
     - Verify task status becomes `FAILED` (or `RETRY` then `FAILED` after max attempts).
     - Verify `attempts` count and `last_error` are updated correctly in `ProcessTracker`.

### 3. Consumer Polling
   - **Setup:** No pending tasks.
   - **Action:** Run consumer.
   - **Verification:** Consumer logs "No pending tasks" (or similar) and continues polling without error.
   - **Setup:** Add a task.
   - **Verification:** Consumer picks up and processes the task on a subsequent poll.

## III. Test Environment Considerations
- Use a separate test database.
- Ensure `jest.globalSetup.js` resets the test database and runs migrations.
- Mock external dependencies where appropriate for unit tests.
- For integration tests, allow components to interact with the test database.
- The consumer (`startConsumer`) runs an infinite loop. For testing `processSingleTask` or a few cycles, it might be better to export `processSingleTask` and call it directly in tests, or add a mechanism to `startConsumer` to run only N cycles for testing.

This plan provides a starting point and can be expanded as more features (e.g., complex transformation rules, ReconRules integration) are added to the Recon Engine.
