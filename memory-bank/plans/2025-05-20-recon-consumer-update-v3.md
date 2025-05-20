# Plan: Update Recon Engine Consumer and Core Logic (V3)

**Date:** 2025-05-20

**Objective:**
Modify `consumer.js` to orchestrate the processing of a `StagingEntry` by calling a new central processing function in `engine.js`. This new function will integrate `generateTransactionEntriesFromStaging` and `createTransactionInternal`. Error handling for `StagingEntry` status updates (e.g., for `NoReconRuleFoundError`, `BalanceError`) will be managed within this new central function. The consumer will primarily update `ProcessTracker` task statuses.

**Phase 1: Update Core Logic (`engine.js`)**

1.  **Define `processStagingEntryWithRecon` in `src/server/core/recon-engine/engine.js`:**
    *   **Signature:** `async function processStagingEntryWithRecon(stagingEntry, merchantId)`
    *   **Imports:**
        *   `prisma` from `../../../services/prisma`
        *   `transactionCore` from `../transaction`
        *   `NoReconRuleFoundError` (already in `engine.js`)
        *   `BalanceError` from `../transaction`
        *   `{ StagingEntryStatus, TransactionStatus }` from `@prisma/client`
    *   **Logic:**
        1.  Wrap the entire operation in a `try...catch (error)` block.
        2.  Call `generateTransactionEntriesFromStaging(stagingEntry, merchantId)` to get `[actualEntryData, expectedEntryData]`.
        3.  Prepare `transactionShellData`:
            *   `merchant_id`: `merchantId`
            *   `status`: `TransactionStatus.POSTED`
            *   `metadata`: `stagingEntry.metadata` (or enhanced, e.g., `{ ...stagingEntry.metadata, source_staging_entry_id: stagingEntry.staging_entry_id }`)
        4.  Call `transactionCore.createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)`.
        5.  If successful, update `StagingEntry` status to `StagingEntryStatus.PROCESSED`:
            ```javascript
            await prisma.stagingEntry.update({
              where: { staging_entry_id: stagingEntry.staging_entry_id },
              data: { status: StagingEntryStatus.PROCESSED },
            });
            ```
        6.  Return the result of `createTransactionInternal` (the new transaction with entries).
    *   **Error Handling within `processStagingEntryWithRecon` (inside the catch block):**
        *   `if (error instanceof NoReconRuleFoundError)`:
            *   Log the error.
            *   Update `StagingEntry` status to `StagingEntryStatus.NEEDS_MANUAL_REVIEW`.
            *   Re-throw the error.
        *   `else if (error instanceof BalanceError)`:
            *   Log the error.
            *   Update `StagingEntry` status to `StagingEntryStatus.NEEDS_MANUAL_REVIEW`.
            *   Re-throw the error.
        *   `else (any other error)`:
            *   Log the error.
            *   Consider updating `StagingEntry` to `NEEDS_MANUAL_REVIEW` as a fallback.
            *   Re-throw the error.
    *   **Exports:** Add `processStagingEntryWithRecon` to `module.exports`.

**Phase 2: Update Consumer Logic (`consumer.js`)**

2.  **Modify `processSingleTask` in `src/server/core/recon-engine/consumer.js`:**
    *   **Imports:**
        *   Import `processStagingEntryWithRecon` from `reconEngine`.
        *   Ensure `ProcessTaskStatus` from `@prisma/client` is imported.
        *   Remove direct imports of `transactionCore`, `NoReconRuleFoundError`, `BalanceError` if no longer directly used by the consumer.
    *   **Main `try...catch` block:**
        *   Fetch `StagingEntry` and `merchantId` as currently done.
        *   Call `await reconEngine.processStagingEntryWithRecon(stagingEntry, stagingEntry.account.merchant_id);`
        *   **If successful (no error thrown):**
            *   Update `ProcessTracker` task to `ProcessTaskStatus.COMPLETED`.
            *   Log success.
        *   **`catch (error)` block (generic):**
            *   Log the error comprehensively (e.g., `error.message`, `error.name`, `task.task_id`, `stagingEntry.staging_entry_id`).
            *   Update `ProcessTracker` task to `ProcessTaskStatus.FAILED`, storing `error.message` (and potentially `error.name`) in `last_error`.
            *   The existing retry logic (checking `task.attempts`) can be simplified or removed if all errors are now considered terminal for the task once `processStagingEntryWithRecon` fails and updates `StagingEntry`. For now, the plan is to mark as FAILED directly.

**Phase 3: Testing and Memory Bank Updates**

3.  **Testing:**
    *   Write/update unit tests for `processStagingEntryWithRecon` in `tests/recon-engine/core/engine.js` (or a new file if preferred, e.g., `engine.integration.js` if it involves more DB interactions).
        *   Test successful processing.
        *   Test `NoReconRuleFoundError` handling (verify `StagingEntry` status update and error re-throw).
        *   Test `BalanceError` handling (verify `StagingEntry` status update and error re-throw).
        *   Test other generic error handling.
    *   Update unit tests for `consumer.js` in a new file `tests/recon-engine/core/consumer.js`.
        *   Mock `reconEngine.processStagingEntryWithRecon`.
        *   Test that `ProcessTracker` is updated to `COMPLETED` on success.
        *   Test that `ProcessTracker` is updated to `FAILED` when `processStagingEntryWithRecon` throws any error.
    *   Run all tests (`npm test`) and ensure they pass, including existing tests for `generateTransactionEntriesFromStaging` and `createTransactionInternal`.
4.  **Memory Bank Updates:**
    *   Update `memory-bank/entities/recon-engine.md`.
    *   Update `memory-bank/systemPatterns.md`.
    *   Update `memory-bank/activeContext.md`.
    *   Update `memory-bank/progress.md`.

**Mermaid Diagram (Revised - No Parentheses in Node Text):**

```mermaid
graph TD
    subgraph Consumer [consumer.js]
        A[Start processSingleTask] --> B{Fetch Next Pending Task};
        B -- No Task --> Z[Wait End Cycle];
        B -- Task Found --> C[Update Task to PROCESSING];
        C --> D{Fetch StagingEntry};
        D -- Not Found --> E[Update Task to FAILED];
        D -- Found --> F[Call engine.processStagingEntryWithRecon];
    end

    subgraph ReconEngineCore [engine.js - processStagingEntryWithRecon]
        F --> G{Call generateTransactionEntriesFromStaging};
        G -- NoReconRuleFoundError --> H[Update StagingEntry to NEEDS MANUAL REVIEW];
        H --> I[Throw Error to Consumer];
        G -- Success --> J[Prepare transactionShellData];
        J --> K[Call transactionCore.createTransactionInternal];
        K -- BalanceError --> L[Update StagingEntry to NEEDS MANUAL REVIEW];
        L --> M[Throw Error to Consumer];
        K -- Other DB Error --> N[Update StagingEntry to NEEDS MANUAL REVIEW optional];
        N --> O[Throw Error to Consumer];
        K -- Success --> P[Update StagingEntry to PROCESSED];
        P --> Q[Return Success to Consumer];
    end
    
    I --> ConsumerErrorHandling;
    M --> ConsumerErrorHandling;
    O --> ConsumerErrorHandling;
    Q --> ConsumerSuccessHandling;

    subgraph Consumer
        ConsumerErrorHandling[Catch Error] --> R[Update Task to FAILED with error details];
        ConsumerSuccessHandling[No Error] --> S[Update Task to COMPLETED];
    end
    
    E --> Z;
    R --> Z;
    S --> Z;
