# Entity: Recon Engine

**Purpose:** The Recon Engine is a core component responsible for processing `StagingEntry` objects. It applies reconciliation rules (`ReconRule`) to generate data for actual and expected ledger entries, and then orchestrates the creation of a `Transaction` with these entries. It also handles specific errors related to this process by updating the `StagingEntry` status.

**Key Functions/Modules:**

-   **`src/server/core/recon-engine/engine.js`**:
    -   `async function generateTransactionEntriesFromStaging(stagingEntry, merchantId)`:
        -   Takes a staging entry and merchant ID.
        -   Looks up the relevant `ReconRule`.
        -   Produces data for two `Entry` objects (one actual with status `POSTED`, one expected with status `EXPECTED`).
        -   Throws `NoReconRuleFoundError` if a rule cannot be found.
    -   `async function processStagingEntryWithRecon(stagingEntry, merchantId)`:
        -   This is the main orchestrator function called by the consumer.
        -   Calls `generateTransactionEntriesFromStaging` to get entry data.
        -   Prepares `transactionShellData`.
        -   Calls `transactionCore.createTransactionInternal` to create the transaction and its entries atomically.
        -   If successful, updates the `StagingEntry` status to `PROCESSED`.
        -   **Error Handling:**
            -   If `NoReconRuleFoundError` occurs (from `generateTransactionEntriesFromStaging`), it updates the `StagingEntry` status to `NEEDS_MANUAL_REVIEW` and re-throws the error.
            -   If `BalanceError` occurs (from `createTransactionInternal`), it updates the `StagingEntry` status to `NEEDS_MANUAL_REVIEW` and re-throws the error.
            -   For other errors, it updates `StagingEntry` to `NEEDS_MANUAL_REVIEW` and re-throws the error.

-   **`src/server/core/recon-engine/consumer.js`**:
    -   `async function processSingleTask()`:
        -   Fetches a pending `PROCESS_STAGING_ENTRY` task from `ProcessTracker`.
        -   Retrieves the `StagingEntry` and `merchantId`.
        -   Calls `reconEngine.processStagingEntryWithRecon(stagingEntry, merchantId)`.
        -   If `processStagingEntryWithRecon` is successful, updates the `ProcessTracker` task to `COMPLETED`.
        -   If `processStagingEntryWithRecon` throws any error, updates the `ProcessTracker` task to `FAILED`, storing error details.
    -   `async function startConsumer()`: Polls for and processes tasks using `processSingleTask`.

**Data Flow (within `processStagingEntryWithRecon`):**
1.  Input: `StagingEntry` object, `merchantId`.
2.  Call `generateTransactionEntriesFromStaging` to get `actualEntryData` and `expectedEntryData`.
    -   If `NoReconRuleFoundError` is thrown by `generateTransactionEntriesFromStaging`:
        -   Update `StagingEntry` status to `NEEDS_MANUAL_REVIEW`.
        -   Re-throw `NoReconRuleFoundError`.
3.  Prepare `transactionShellData` (status `POSTED`, `merchant_id`, `metadata`).
4.  Call `transactionCore.createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)`.
    -   If `BalanceError` is thrown by `createTransactionInternal`:
        -   Update `StagingEntry` status to `NEEDS_MANUAL_REVIEW`.
        -   Re-throw `BalanceError`.
    -   If any other error is thrown by `createTransactionInternal`:
        -   Update `StagingEntry` status to `NEEDS_MANUAL_REVIEW`.
        -   Re-throw the error.
5.  If `createTransactionInternal` is successful:
    -   Update `StagingEntry` status to `PROCESSED`.
    -   Return the created transaction.

This component is crucial for automating the creation of balanced, double-entry bookkeeping records based on defined business logic and handling failures gracefully at the `StagingEntry` level.
