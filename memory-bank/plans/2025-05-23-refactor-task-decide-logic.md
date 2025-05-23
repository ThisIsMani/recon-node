## Plan: Refactor Task Decide Logic and Validation Flow

**Date:** 2025-05-23

**Objective:** Refactor the Recon Engine's task system so that:
1. The `ProcessTracker` payload for `PROCESS_STAGING_ENTRY` tasks only contains `staging_entry_id`.
2. Each `ReconTask` implementation has an instance method `decide(processTrackerTask: ProcessTracker)` which fetches necessary data (like `StagingEntry.processing_mode`) to determine if it can handle the task. If yes, it stores the fetched data (e.g., `StagingEntry`) internally for use by `validate` and `run`.
3. `TaskManager.findApplicableTask` iterates over task *instances*, calling their `decide` method.
4. `validate()` and `run()` methods on task instances operate on the data loaded by their `decide()` method.

## Steps

- [ ] **1. Revert `ProcessTracker` Payload Change in `staging-entry/index.ts` (if previously modified):**
    - Ensure payload for `PROCESS_STAGING_ENTRY` is `{ staging_entry_id: newEntry.staging_entry_id }`.
    - Tool: `read_file` then `replace_in_file` if needed.
    - Path: `src/server/core/staging-entry/index.ts`

- [ ] **2. Update `ReconTask` Interface (`task-interface.ts`):**
    - `decide(processTrackerTask: ProcessTracker): Promise<boolean>;`
    - `validate(): Promise<Result<void, AppError>>;` (AppError from `../../../errors/AppError`)
    - `run(): Promise<Result<any, AppError>>;` (Success type `any` for now)
    - Tool: `replace_in_file`
    - Path: `src/server/core/recon-engine/task/task-interface.ts`

- [ ] **3. Refactor `BaseTask.ts`:**
    - Implement `ReconTask`.
    - Add `protected currentStagingEntry: StagingEntryWithAccount | null = null;`
    - Add `protected currentProcessTrackerTask: ProcessTracker | null = null;`
    - Update abstract method signatures for `decide`, `validate`, `run` to match new `ReconTask` interface.
    - `markAsNeedsManualReview` and `markAsProcessed` will use `this.currentStagingEntry?.staging_entry_id`.
    - Tool: `replace_in_file`
    - Path: `src/server/core/recon-engine/task/base-task.ts`

- [ ] **4. Refactor `ExpectedEntryMatchingTask.ts`:**
    - Update `decide` method:
        - Signature: `async decide(processTrackerTask: ProcessTracker): Promise<boolean>;`
        - Extract `staging_entry_id`. Fetch `StagingEntry` (including `account` for `merchant_id` and `processing_mode`).
        - If `processing_mode` is `CONFIRMATION`: store fetched `StagingEntry` in `this.currentStagingEntry`, store `processTrackerTask` in `this.currentProcessTrackerTask`, return `true`. Else `false`.
    - Update `validate` method:
        - Signature: `async validate(): Promise<Result<void, AppError>>;`
        - Use `this.currentStagingEntry`. Perform all common and specific validations.
    - Update `run` method:
        - Signature: `async run(): Promise<Result<TransactionWithEntries | null, AppError>>;` (Using a more specific success type `TransactionWithEntries` from `../types` or Prisma).
        - Use `this.currentStagingEntry` and `this.currentStagingEntry.account.merchant_id`.
    - Tool: `replace_in_file`
    - Path: `src/server/core/recon-engine/task/matching-task.ts`

- [ ] **5. Refactor `TransactionCreationTask.ts`:**
    - Similar changes to `ExpectedEntryMatchingTask` for its `decide`, `validate`, and `run` methods, tailored for `TRANSACTION` mode.
    - Tool: `replace_in_file`
    - Path: `src/server/core/recon-engine/task/transaction-task.ts`

- [ ] **6. Refactor `TaskManager.ts`:**
    - Constructor takes `taskInstances: ReconTask[]`.
    - `async findApplicableTask(processTrackerTask: ProcessTracker): Promise<ReconTask | null>`: Iterate `taskInstances`, call `await taskInstance.decide(processTrackerTask)`, return first that is `true`.
    - Tool: `replace_in_file`
    - Path: `src/server/core/recon-engine/task/task-manager.ts`

- [ ] **7. Refactor `consumer.ts`:**
    - `ProcessStagingEntryPayload` interface should only have `staging_entry_id`.
    - `applicableTaskInstance = await taskManager.findApplicableTask(pendingTask);`
    - If `applicableTaskInstance`: `validationResult = await applicableTaskInstance.validate();` then `runResult = await applicableTaskInstance.run();`.
    - Ensure `staging_entry_id` is correctly extracted from `pendingTask.payload` for logging/error reporting if `applicableTaskInstance` is null or methods fail early.
    - Tool: `replace_in_file`
    - Path: `src/server/core/recon-engine/consumer.ts`

- [ ] **8. Update Tests:**
    - `task-manager.test.ts`: Mock `decide` on task instances.
    - `consumer.test.ts`: Mock `taskManager.findApplicableTask` to return a mock task instance. Mock instance's `validate` and `run`.
    - `matching-task.test.ts` & `transaction-task.test.ts`:
        - Test `decide` method: mock DB calls for fetching `StagingEntry`, check return value and internal state (`this.currentStagingEntry`).
        - Test `validate` and `run` methods assuming `decide` has primed the instance.
    - Tool: `replace_in_file` for each test file.

- [ ] **9. Run Tests & Fix:**
    - Tool: `execute_command`, `{"command": "npm test", "requires_approval": "false"}`.
    - Policy: `test-execution-policy.md`.

- [ ] **10. Update Memory Bank Documentation:**
    - `entities/recon-engine.md`, `activeContext.md`, `progress.md`.
    - Policy: `memory-bank-interaction.md`.

<!--
{
  "planName": "2025-05-23-refactor-task-decide-logic",
  "plan": [
    { "id": 1, "description": "Revert/Confirm ProcessTracker payload in staging-entry/index.ts", "tool": "read_file", "args": {"path": "src/server/core/staging-entry/index.ts"}, "status": "pending" },
    { "id": 2, "description": "Update ReconTask interface", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/task/task-interface.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 3, "description": "Refactor BaseTask.ts", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/task/base-task.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 4, "description": "Refactor ExpectedEntryMatchingTask.ts", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/task/matching-task.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 5, "description": "Refactor TransactionCreationTask.ts", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/task/transaction-task.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 6, "description": "Refactor TaskManager.ts", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/task/task-manager.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 7, "description": "Refactor consumer.ts", "tool": "replace_in_file", "args": {"path": "src/server/core/recon-engine/consumer.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 8, "description": "Update tests (multiple files)", "tool": "replace_in_file", "args": {"path": "TBD_test_file.ts", "diff": "TBD"}, "status": "pending" },
    { "id": 9, "description": "Run tests and fix", "tool": "execute_command", "args": {"command": "npm test", "requires_approval": "false"}, "status": "pending" },
    { "id": 10, "description": "Update Memory Bank documentation", "tool": "replace_in_file", "args": {"path": "TBD_memory_bank_file.md", "diff": "TBD"}, "status": "pending" }
  ]
}
-->
