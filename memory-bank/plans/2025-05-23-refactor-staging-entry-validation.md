## Plan: Refactor StagingEntry Validation Logic

**Date:** 2025-05-23

**Objective:** Move `StagingEntry` validation logic from `consumer.ts` into the `validate` methods of individual task implementations (`TransactionCreationTask`, `ExpectedEntryMatchingTask`). Tasks will fetch their own `StagingEntry` data. The `ProcessTracker` payload for `PROCESS_STAGING_ENTRY` tasks will be updated to include `processing_mode`.

## Steps

- [ ] **1. Update `ProcessTracker` Payload Creation:**
      - Tool: `read_file`
      - Args: `{"path": "src/server/core/staging-entry/index.ts"}` (Locate where `PROCESS_STAGING_ENTRY` tasks are created).
- [ ] **2. Modify `staging-entry/index.ts`:**
      - Tool: `replace_in_file`
      - Args: Update `processTrackerCore.createTask` to include `processing_mode: newStagingEntry.processing_mode` in the payload for `PROCESS_STAGING_ENTRY` tasks.
- [ ] **3. Update `ReconTask` Interface (`task-interface.ts`):**
      - Tool: `replace_in_file`
      - Args:
        - Change `decide(stagingEntry: StagingEntryWithAccount)` to `decide(processingMode: StagingEntryProcessingMode): boolean;`
        - Change `validate(stagingEntry: StagingEntryWithAccount)` to `validate(stagingEntryId: string): Promise<Result<StagingEntryWithAccount, ValidationError>>;` (Returns fetched entry on success).
        - Change `run(stagingEntry: StagingEntryWithAccount, merchantId: string)` to `run(stagingEntry: StagingEntryWithAccount): Promise<Result<Prisma.TransactionGetPayload<{ include: { entries: true } }> | null, ProcessingError>>;` (merchantId will be derived from the validated StagingEntry).
- [ ] **4. Refactor `TaskManager.ts`:**
      - Tool: `replace_in_file`
      - Args:
        - Update `findApplicableTask` to accept `processingMode: StagingEntryProcessingMode` and pass it to `task.decide()`.
- [ ] **5. Refactor `ExpectedEntryMatchingTask.ts`:**
      - Tool: `replace_in_file`
      - Args:
        - Update `decide` method signature.
        - Update `validate` method:
            - Accept `stagingEntryId: string`.
            - Fetch `StagingEntry` using `prisma.stagingEntry.findUniqueOrThrow`.
            - Perform all common validations (entry exists, `account_id`, `account.merchant_id`).
            - Perform task-specific validations (e.g., `order_id`, `ReconRule` for `account_two_id`).
            - Return `ok(stagingEntry)` or `err(ValidationError)`.
        - Update `run` method:
            - Accept `stagingEntry: StagingEntryWithAccount` (passed from the new `process` flow).
            - Use `stagingEntry.account.merchant_id`.
- [ ] **6. Refactor `TransactionCreationTask.ts`:**
      - Tool: `replace_in_file`
      - Args:
        - Update `decide` method signature.
        - Update `validate` method:
            - Accept `stagingEntryId: string`.
            - Fetch `StagingEntry`.
            - Perform common validations.
            - Perform task-specific validations (e.g., `ReconRule` for `account_one_id`).
            - Return `ok(stagingEntry)` or `err(ValidationError)`.
        - Update `run` method:
            - Accept `stagingEntry: StagingEntryWithAccount`.
            - Use `stagingEntry.account.merchant_id`.
- [ ] **7. Refactor `consumer.ts`:**
      - Tool: `replace_in_file`
      - Args:
        - Update `ProcessStagingEntryPayload` interface to include `processing_mode`.
        - Extract `staging_entry_id` and `processing_mode` from task payload.
        - Call `taskManager.findApplicableTask(processing_mode)`.
        - If task found:
            - Call `const validationResult = await applicableTask.validate(stagingEntryId);`
            - If `validationResult.isOk()`:
                - `const validatedStagingEntry = validationResult.value;`
                - `await applicableTask.run(validatedStagingEntry);`
            - Else (validation failed):
                - Log error from `validationResult.error`.
                - Update `ProcessTracker` to FAILED.
        - Remove old `StagingEntry` fetching and common validation logic from consumer.
- [ ] **8. Update `BaseTask.ts` (if `markAsNeedsManualReview` is used by tasks):**
      - Tool: `read_file`
      - Args: `{"path": "src/server/core/recon-engine/task/base-task.ts"}`
      - Note: Ensure `markAsNeedsManualReview` still functions correctly if tasks are now fetching their own `StagingEntry`. It might need `stagingEntry.metadata` as an argument if it's not refetched. (This step might be minor or not needed if tasks handle their own status updates fully).
- [ ] **9. Update Tests:**
      - `consumer.test.ts`: Adjust mocks for `findApplicableTask` (now takes `processing_mode`) and the calls to `validate` and `run` on the mock task.
      - `matching-task.test.ts` & `transaction-task.test.ts`:
          - Test new `validate(stagingEntryId)` method thoroughly, including common validations moved from consumer and `StagingEntry` fetching. Mock `prisma.stagingEntry.findUniqueOrThrow`.
          - Test `run(stagingEntry)` method.
      - `task-manager.test.ts`: Update tests for `findApplicableTask` signature change.
- [ ] **10. Run Tests & Fix:**
      - Tool: `execute_command`
      - Args: `{"command": "npm test", "requires_approval": "false"}`
      - Policy: `test-execution-policy.md`. Iterate on fixes if tests fail.
- [ ] **11. Update Memory Bank Documentation:**
      - `entities/recon-engine.md`: Reflect changes to task validation and consumer logic.
      - `activeContext.md` & `progress.md`: Log completion of this refactor.
      - Policy: `memory-bank-interaction.md`.

<!--
{
  "planName": "2025-05-23-refactor-staging-entry-validation",
  "plan": [
    { "id": 1, "description": "Read staging-entry/index.ts", "tool": "read_file", "args": {"path": "src/server/core/staging-entry/index.ts"}, "status": "pending" },
    { "id": 2, "description": "Modify staging-entry/index.ts to include processing_mode in payload", "tool": "replace_in_file", "args": {"path": "src/server/core/staging-entry/index.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 3, "description": "Update ReconTask interface", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/task/task-interface.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 4, "description": "Refactor TaskManager.ts", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/task/task-manager.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 5, "description": "Refactor ExpectedEntryMatchingTask.ts", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/task/matching-task.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 6, "description": "Refactor TransactionCreationTask.ts", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/task/transaction-task.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 7, "description": "Refactor consumer.ts", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/consumer.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 8, "description": "Review BaseTask.ts", "tool": "read_file", "args": {"path": "src/server/core/recon-engine/task/base-task.ts"}, "status": "pending" },
    { "id": 9, "description": "Update tests", "tool": "replace_in_file", "args": {"path": "TBD_test_file.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 10, "description": "Run tests and fix", "tool": "execute_command", "args": {"command": "npm test", "requires_approval": "false"}, "status": "pending" },
    { "id": 11, "description": "Update Memory Bank documentation", "tool": "replace_in_file", "args": {"path": "TBD_memory_bank_file.md", "diff": "TBD"}, "status": "pending" }
  ]
}
-->
