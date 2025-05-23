# Entity: Recon Engine

The Recon Engine is the core component responsible for processing `StagingEntry` records, attempting to match them against existing expectations or generating new transactions.

## Core Functions

-   **`generateTransactionEntriesFromStaging(stagingEntry, merchantId)`** (`src/server/core/recon-engine/engine.ts`)
    -   Takes a `StagingEntry` and `merchantId`.
    -   **Rule Selection:** Finds an applicable `ReconRule` where `merchant_id` matches and `stagingEntry.account_id` matches `account_one_id` in the rule. This assumes that for generating new transaction pairs (typical in `TRANSACTION` mode), the `stagingEntry.account_id` represents the source/initiating account.
        -   Throws `NoReconRuleFoundError` if no such rule applies (e.g., `No reconciliation rule found for merchant X where account Y is account_one_id...`).
    -   Determines the `contra_account_id` (which will be `account_two_id` from the selected rule) and `expectedEntryType` based on the rule and the staging entry.
    -   Constructs data for two entries:
        1.  **Actual Entry**: Status `POSTED`, based directly on `stagingEntry` details. Metadata includes a spread of `stagingEntry.metadata`, `order_id` (from `stagingEntry.metadata`), and `source_staging_entry_id`.
        2.  **Expected Entry**: Status `EXPECTED` for the `contra_account_id`. Metadata includes a spread of `stagingEntry.metadata`, `order_id` (from `stagingEntry.metadata`), `source_staging_entry_id`, and `recon_rule_id`.
    -   Returns an array containing these two entry data objects.

-   **`processStagingEntryWithRecon(stagingEntry, merchantId)`** (`src/server/core/recon-engine/engine.ts`)
    -   Orchestrates the processing of a single `StagingEntry`.
    -   Validates `stagingEntry` and `merchantId`.
    -   Validates `stagingEntry.processing_mode`. If invalid, updates `StagingEntry` to `NEEDS_MANUAL_REVIEW` and throws an error.
    -   **Branches based on `stagingEntry.processing_mode`**:
        -   **`CONFIRMATION` Mode:**
            -   Logs processing start.
            -   Determines if a match attempt is warranted:
                -   **Rule Selection:** A `ReconRule` must exist where `merchant_id` matches and `stagingEntry.account_id` matches `account_two_id` in the rule (implying it's an "expecting" account for fulfillment).
                -   `stagingEntry.metadata.order_id` must be present.
            -   If match attempt is warranted (i.e., a suitable rule and `orderId` exist):
                -   Searches for `EXPECTED` entries matching `stagingEntry.account_id`, `merchantId`, non-terminal transaction status, and `metadata.order_id`.
                -   If one unique `matchedExpectedEntry` is found:
                    -   Validates amount, currency, and entry type against `stagingEntry`.
                    -   If valid:
                        -   Archives the `originalTransaction` and its entries (sets status to `ARCHIVED`, sets `discarded_at`).
                        -   Creates a new "evolved" `Transaction` (status `POSTED`, version incremented) using `transactionCore.createTransactionInternal`.
                            -   The new transaction includes:
                                1.  A `POSTED` entry based on the `stagingEntry` (fulfilling entry).
                                2.  A `POSTED` entry carried over from the original transaction's other leg.
                            -   Metadata for the new transaction and entries includes details like `source_staging_entry_id`, `evolved_from_transaction_id`, `fulfilled_expected_entry_id`, and `derived_from_entry_id`.
                        -   Updates `StagingEntry` to `PROCESSED`, sets `discarded_at`, and records match details in metadata.
                        -   Returns the new evolved transaction.
                    -   If invalid match (amount/currency/type mismatch):
                        -   Updates `originalTransaction` status to `MISMATCH`.
                        -   Updates `StagingEntry` to `NEEDS_MANUAL_REVIEW` with mismatch details.
                        -   Throws a mismatch error.
                -   If multiple matches found (ambiguous): Updates `StagingEntry` to `NEEDS_MANUAL_REVIEW` and throws an error.
                -   If no match found (but attempt was made): Proceeds to the "No Match Found" handling.
            -   If match attempt was NOT warranted OR no match was found after an attempt:
                -   Updates `StagingEntry` to `NEEDS_MANUAL_REVIEW` with `NoMatchFoundError` details.
                -   Throws `NoMatchFoundError`.
        -   **`TRANSACTION` Mode:**
            -   Logs processing start.
            -   Calls `generateTransactionEntriesFromStaging` to get data for the actual (POSTED) and expected entries.
            -   Constructs `transactionShellData` for a new transaction (status `EXPECTED`, `version: 1`). Metadata includes a spread of `stagingEntry.metadata`, `source_staging_entry_id`, and `processing_mode`.
            -   Calls `transactionCore.createTransactionInternal` to atomically create the new transaction and its two entries.
            -   Updates `StagingEntry` to `PROCESSED`, sets `discarded_at`, and records `created_transaction_id` in metadata.
            -   Returns the new transaction.
    -   **Error Handling:**
        -   Catches errors during processing (e.g., `NoReconRuleFoundError`, `BalanceError` from `transactionCore`).
        -   Updates `StagingEntry` to `NEEDS_MANUAL_REVIEW` with error details in metadata.
        -   Re-throws the error to be handled by the consumer (which updates `ProcessTracker`).

## Error Hierarchy (`src/server/core/recon-engine/error/`)

The Recon Engine implements a structured error hierarchy:

-   **`ReconEngineError`** (`src/server/core/recon-engine/error/base-error.ts`)
    -   Base class for Recon Engine specific errors.
    -   Extends the global `AppError` (`src/errors/AppError.ts`), inheriting `statusCode`, `errorCode`, `isOperational`, and `details`.
    -   Adds an optional `cause` property for error chaining.

-   **`ValidationError`** (`src/server/core/recon-engine/error/validation-error.ts`)
    -   Extends `ReconEngineError`. Used for data validation failures.
    -   Defaults to `statusCode: 400` and `errorCode: 'ERR_RECON_VALIDATION'`.
    -   Now has 100% test coverage to ensure robust error handling.

-   **`ProcessingError`** (`src/server/core/recon-engine/error/processing-error.ts`)
    -   Extends `ReconEngineError`. Used for errors during processing.
    -   Defaults to `statusCode: 500` and `errorCode: 'ERR_RECON_PROCESSING'`.

## Task System (`src/server/core/recon-engine/task/`)

The Recon Engine uses a task-based architecture:

-   **`ReconTask` Interface** (`src/server/core/recon-engine/task/task-interface.ts`)
    -   Defines the contract for recon tasks.
    -   Methods:
        -   `decide(processTrackerTask: ProcessTracker): Promise<boolean>`: Determines if the task can handle the given `ProcessTracker` task. If yes, it should load necessary data (like `StagingEntry`) into itself.
        -   `validate(): Promise<Result<void, AppError>>`: Validates data loaded by `decide`. Returns `ok(undefined)` on success.
        -   `run(): Promise<Result<TransactionWithEntries | null, AppError>>`: Executes business logic using data from `decide` and `validate`.

-   **`BaseTask`** (`src/server/core/recon-engine/task/base-task.ts`)
    -   Abstract implementation of `ReconTask`.
    -   Manages `this.currentStagingEntry: StagingEntryWithAccount | null` and `this.currentProcessTrackerTask: ProcessTracker | null`.
    -   Provides utilities for status updates (`updateStagingEntryStatus`, `markAsNeedsManualReview`, `markAsProcessed`) which now use `this.currentStagingEntry`.

-   **Task Implementations**:
    -   **`TransactionCreationTask`** (`src/server/core/recon-engine/task/transaction-task.ts`)
        -   Handles staging entries in `TRANSACTION` mode
        -   Creates new transaction pairs with one posted and one expected entry
        -   Now has 100% test coverage with comprehensive tests for all methods
    
    -   **`ExpectedEntryMatchingTask`** (`src/server/core/recon-engine/task/matching-task.ts`)
        -   Handles staging entries in `CONFIRMATION` mode
        -   Attempts to match against existing expected entries
        -   Creates evolved transactions when matches are found
        -   Still needs improved test coverage (currently at 38.59%)

-   **`TaskManager`** (`src/server/core/recon-engine/task/task-manager.ts`)
    -   Coordinates task selection and execution
    -   Finds the appropriate task for a given `ProcessTracker` task.
    -   Provides a plugin architecture for adding new task types.

## Consumer (`src/server/core/recon-engine/consumer.ts`)

-   Polls `ProcessTracker` for `PROCESS_STAGING_ENTRY` tasks.
-   **`processSingleTask()`**:
    -   Fetches a pending `ProcessTracker` task.
    -   Updates its status to `PROCESSING`.
    -   Extracts `staging_entry_id` from the payload for logging.
    -   Uses `TaskManager.findApplicableTask(processTrackerTask)` to get the `ReconTask`.
    -   Calls `applicableTaskInstance.validate()`.
    -   If valid, calls `applicableTaskInstance.run()`.
    -   On overall success, updates `ProcessTracker` task status to `COMPLETED`.
    -   On failure, updates task status to `FAILED` and logs the error with contextual information.
-   **`startConsumer()`**: Initiates polling loop with configurable interval using `RECON_ENGINE_POLL_INTERVAL_MS` from config.

## Test Coverage

The test coverage for the Recon Engine has been significantly improved:
- `transaction-task.ts`: Improved from 46.8% to 100% coverage
- `process-tracker/index.ts`: Improved from 28.57% to 100% coverage
- `validation-error.ts`: Improved from 66.66% to 100% coverage

Areas that still need coverage improvement:
- `matching-task.ts`: Currently at 38.59% coverage
- `recon-engine-runner.ts`: Currently at 0% coverage

## Key Concepts

-   **Rule Selection Logic:**
    -   In **`TRANSACTION` mode** (typically when `generateTransactionEntriesFromStaging` is used to create new expectations): The engine looks for a `ReconRule` where the `stagingEntry.account_id` is `account_one_id` (the source/initiating account). The `EXPECTED` entry is then created for `account_two_id`.
    -   In **`CONFIRMATION` mode** (when `processStagingEntryWithRecon` attempts to match an existing expectation): The engine looks for a `ReconRule` where the `stagingEntry.account_id` is `account_two_id` (the destination/expecting account).
-   **Conditional Matching (CONFIRMATION mode):** The engine only attempts to match/fulfill if the `stagingEntry.account_id` corresponds to `account_two_id` in an applicable `ReconRule` (i.e., it's an "expecting" account) and the `stagingEntry` has an `order_id`.
-   **Transaction Evolution (CONFIRMATION mode):** When an expected entry is fulfilled, its original transaction is archived, and a new, evolved transaction (incremented version, status `POSTED`) is created, linking back to the original.
-   **Direct Transaction Creation (TRANSACTION mode):** Utilizes `generateTransactionEntriesFromStaging` (which now specifically uses `account_one_id` from the rule) to form a new transaction with one `POSTED` leg (from staging entry) and one `EXPECTED` leg.
-   **Atomicity:** Uses `prisma.$transaction` for operations that must succeed or fail together (e.g., creating/updating transactions and entries, updating staging entry status).
-   **Error States:** `StagingEntry` records are moved to `NEEDS_MANUAL_REVIEW` upon any processing error, with error details stored in their metadata.
-   **Idempotency (via Process Tracker):** The consumer attempts to ensure tasks are processed once by updating task statuses. (Further enhancements for strict idempotency might be needed for retries on transient errors).
-   **Extensibility:** The task-based architecture makes it easy to add new processing modes by implementing additional `ReconTask` classes.
-   **Type Safety:** All components use TypeScript for improved type safety and code maintenance.

## Related Entities

-   `StagingEntry`: The input to the Recon Engine.
-   `ReconRule`: Used to determine contra-accounts and expected behavior.
-   `Transaction`: Created or updated by the engine.
-   `Entry`: Created as part of transactions.
-   `ProcessTracker`: Manages asynchronous processing tasks for the engine.