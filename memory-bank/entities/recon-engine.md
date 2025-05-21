# Entity: Recon Engine

**Purpose:** The Recon Engine is a core component responsible for processing `StagingEntry` objects. It first attempts to match a `StagingEntry` against existing `EXPECTED` entries. If a match is found and validated, it proceeds to fulfill the expectation by archiving the original transaction and creating a new, evolved transaction (Phase 2). If no match is found, or if a match is invalid (mismatch), it applies reconciliation rules (`ReconRule`) to generate data for actual and expected ledger entries, and then orchestrates the creation of a new `Transaction` with these entries. It also handles specific errors by updating the `StagingEntry` status.

**Key Functions/Modules:**

-   **`src/server/core/recon-engine/engine.js`**:
    -   `async function generateTransactionEntriesFromStaging(stagingEntry, merchantId)`:
        -   Takes a staging entry and merchant ID.
        -   Looks up the relevant `ReconRule`.
        -   Produces data for two `Entry` objects (one actual with status `POSTED`, one expected with status `EXPECTED`).
        -   Throws `NoReconRuleFoundError` if a rule cannot be found.
    -   `async function processStagingEntryWithRecon(stagingEntry, merchantId)`:
        -   This is the main orchestrator function called by the consumer.
        -   **Matching & Validation Logic (Phase 1 & 2):**
            -   Attempts to find a unique, existing `EXPECTED` entry in a non-archived, non-mismatched transaction that matches the `stagingEntry`'s `account_id`, `merchantId`, and `metadata.order_id`.
            -   **If a unique match is found (`matchedExpectedEntry` and `originalTransaction`):**
                -   Validates the `amount`, `currency`, and `entry_type` of the `stagingEntry` against the `matchedExpectedEntry`.
                -   **If valid match (Phase 2 Fulfillment):**
                    -   Atomically (using `prisma.$transaction`):
                        -   Archives the `originalTransaction` (status `ARCHIVED`, `discarded_at` set). Also, all `Entry` records belonging to this `originalTransaction` have their status updated to `EntryStatus.ARCHIVED` and their `discarded_at` field set.
                        -   Prepares data for a new evolved transaction:
                            -   `logical_transaction_id`: same as `originalTransaction`.
                            -   `version`: `originalTransaction.version + 1`.
                            -   `status`: `TransactionStatus.POSTED`.
                            -   `metadata`: includes `source_staging_entry_id`, `evolved_from_transaction_id`, `fulfilled_expected_entry_id`.
                        -   Prepares data for two new `POSTED` entries for the evolved transaction:
                            1.  One entry derived from the current `stagingEntry`.
                            2.  One entry derived from the original `POSTED` leg of the `originalTransaction`.
                        -   Calls `transactionCore.createTransactionInternal` to create the new evolved transaction and its entries.
                        -   Updates the `stagingEntry.status` to `PROCESSED`, sets `stagingEntry.discarded_at` to the current timestamp, and updates its metadata with `evolved_transaction_id` and `match_type: 'Phase2_Fulfilled'`.
                    -   Returns the `newEvolvedTransaction`.
                -   **If invalid match (mismatch):**
                    -   Atomically updates the `originalTransaction.status` to `MISMATCH`.
                    -   Updates `stagingEntry.status` to `NEEDS_MANUAL_REVIEW` (without setting `discarded_at`), and adds error details in metadata.
                    -   Throws an error (`Mismatch detected...`).
            -   **If multiple matches are found (ambiguous match):**
                -   Updates `stagingEntry.status` to `NEEDS_MANUAL_REVIEW` (without setting `discarded_at`), and adds error details.
                -   Throws an error (`Ambiguous match...`).
            -   **If no match is found:**
                -   Updates `stagingEntry.status` to `NEEDS_MANUAL_REVIEW` (without setting `discarded_at`), and adds error details.
                -   Throws a `NoMatchFoundError`. (Does not proceed to generate new transaction).
        -   **Error Handling (General):**
            -   The main `catch` block in `processStagingEntryWithRecon` handles errors.
            -   If errors like `NoReconRuleFoundError` or `BalanceError` (which could occur if a different part of the logic *did* attempt transaction creation, though not the "no match" path currently) are caught, or if `NoMatchFoundError`, `MismatchError`, `AmbiguousMatchError` are caught, it ensures the `StagingEntry` status is `NEEDS_MANUAL_REVIEW` (without setting `discarded_at`).
            -   For other unexpected errors, it also updates `StagingEntry` to `NEEDS_MANUAL_REVIEW` (without `discarded_at`).

-   **`src/server/core/recon-engine/consumer.js`**:
    -   `async function processSingleTask()`:
        -   Fetches a pending `PROCESS_STAGING_ENTRY` task from `ProcessTracker`.
        -   Retrieves the `StagingEntry` and `merchantId`.
        -   Calls `reconEngine.processStagingEntryWithRecon(stagingEntry, merchantId)`.
        -   If `processStagingEntryWithRecon` is successful (returns a transaction object), updates the `ProcessTracker` task to `COMPLETED`.
        -   If `processStagingEntryWithRecon` throws any error, updates the `ProcessTracker` task to `FAILED`, storing error details.
    -   `async function startConsumer()`: Polls for and processes tasks using `processSingleTask`. The polling interval is configurable via the `RECON_ENGINE_POLL_INTERVAL_MS` environment variable, defaulting to 1000ms (1 second).

**Data Flow (within `processStagingEntryWithRecon` - Updated for Phase 2):**
1.  Input: `StagingEntry` object, `merchantId`.
2.  **Attempt to Match Existing Expected Entry:**
    -   Query for `EXPECTED` entries based on `order_id`, `account_id`, `merchant_id`.
    -   If **unique match found**:
        -   Validate `amount`, `currency`, `entry_type`.
        -   If **valid (Fulfillment Path)**:
            -   **Atomically:**
                -   Archive original transaction (status `ARCHIVED`, set `discarded_at`). All its `Entry` records are also updated to `status: EntryStatus.ARCHIVED` and have `discarded_at` set.
                -   Create new evolved transaction (status `POSTED`, version incremented, same `logical_transaction_id`) with two `POSTED` entries:
                    -   One from the current `stagingEntry`.
                    -   One from the other (posted) leg of the original transaction.
                -   Update `StagingEntry` status to `PROCESSED`, set `discarded_at`, add `evolved_transaction_id` and `match_type: 'Phase2_Fulfilled'` to metadata.
            -   Return the new evolved transaction.
        -   If **invalid (mismatch)**:
            -   Update original `Transaction` status to `MISMATCH`.
            -   Update `StagingEntry` status to `NEEDS_MANUAL_REVIEW` (without `discarded_at`), with error details.
            -   Throw `Error("Mismatch detected...")`. (End of flow)
    -   If **multiple matches found**:
        -   Update `StagingEntry` status to `NEEDS_MANUAL_REVIEW` (without `discarded_at`), with error details.
        -   Throw `Error("Ambiguous match...")`. (End of flow)
    -   If **no match found**:
        -   Update `StagingEntry` status to `NEEDS_MANUAL_REVIEW` (without `discarded_at`), with error details.
        -   Throw `NoMatchFoundError`. (End of flow - no new transaction generated automatically).

This component is crucial for automating the creation of balanced, double-entry bookkeeping records. The matching and fulfillment logic aims to accurately evolve transactions when expected payments are realized, maintaining a clear audit trail. Unmatched entries are flagged for manual review.
