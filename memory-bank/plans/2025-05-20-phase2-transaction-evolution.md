# Plan: Phase 2 - Recon Engine: Transaction Evolution (Archival & Fulfillment)

**Date:** 2025-05-20

**Overall Task:** Implement Staging Entry Matching & Transaction Evolution

**Phase Goal:** Enhance `processStagingEntryWithRecon` to handle the `MATCHED_PENDING_FULFILLMENT` scenario by archiving the original transaction, creating a new evolved (fully `POSTED`) transaction, and updating relevant statuses and metadata.

**Key Files to Modify:**
*   `src/server/core/recon-engine/engine.js` (primarily `processStagingEntryWithRecon`)
*   `tests/recon-engine/core/recon-engine-matching.test.js` (or a new test file for fulfillment)

---

## Steps for Phase 2

- [ ] **2.1: Implement Transaction Evolution Logic in `processStagingEntryWithRecon`**
    - **File:** `src/server/core/recon-engine/engine.js`
    - **Action:**
        - Locate the `if (isValidMatch)` block within the `if (matchedExpectedEntry && originalTransaction)` section where it currently returns `MATCHED_PENDING_FULFILLMENT`.
        - Replace the current return with the following logic, wrapped in a `prisma.$transaction(async (tx) => { ... })` for atomicity.
            - **a. Archive Original Transaction:**
                - Using the `tx` client, update the `originalTransaction` status to `ARCHIVED` and set its `discarded_at` timestamp.
            - **b. Prepare Data for the New Evolved Transaction:**
                - `logical_transaction_id`: `originalTransaction.logical_transaction_id`
                - `version`: `originalTransaction.version + 1`
                - `status`: `TransactionStatus.POSTED`
                - `merchant_id`: `originalTransaction.merchant_id`
                - `metadata`: Combine or choose metadata. For now, use `stagingEntry.metadata` and add `source_staging_entry_id: stagingEntry.staging_entry_id` and `evolved_from_transaction_id: originalTransaction.transaction_id`.
            - **c. Prepare Data for the Two New POSTED Entries:**
                - **New Entry 1 (from the current `stagingEntry`):**
                    - `account_id`: `stagingEntry.account_id`
                    - `entry_type`: `stagingEntry.entry_type`
                    - `amount`: `stagingEntry.amount`
                    - `currency`: `stagingEntry.currency`
                    - `status`: `EntryStatus.POSTED`
                    - `effective_date`: `stagingEntry.effective_date`
                    - `metadata`: `{ ...stagingEntry.metadata, source_staging_entry_id: stagingEntry.staging_entry_id, fulfilled_expected_entry_id: matchedExpectedEntry.entry_id }`
                - **New Entry 2 (from the other leg of `originalTransaction`):**
                    - Identify the original posted entry from `originalTransaction.entries` (the one that is not `matchedExpectedEntry`).
                    - `account_id`: `originalPostedEntry.account_id`
                    - `entry_type`: `originalPostedEntry.entry_type`
                    - `amount`: `originalPostedEntry.amount`
                    - `currency`: `originalPostedEntry.currency`
                    - `status`: `EntryStatus.POSTED`
                    - `effective_date`: `stagingEntry.effective_date` (use the fulfilling entry's date for consistency in the new transaction).
                    - `metadata`: `{ ...originalPostedEntry.metadata, derived_from_entry_id: originalPostedEntry.entry_id }`
            - **d. Create New Evolved Transaction:**
                - Call `transactionCore.createTransactionInternal` (passing `tx` as the Prisma client) with the new transaction shell data and the two new entry data objects.
            - **e. Update Staging Entry:**
                - Update `stagingEntry.status` to `StagingEntryStatus.PROCESSED`.
                - Update `stagingEntry.metadata` to include `evolved_transaction_id: newEvolvedTransaction.transaction_id`. (This might overwrite some previous metadata, ensure it's additive if needed).
            - Return the `newEvolvedTransaction`.

- [ ] **2.2: Update Unit Tests for Phase 2 Fulfillment Logic**
    - **File:** `tests/recon-engine/core/recon-engine-matching.test.js` (or create a new `recon-engine-fulfillment.test.js`).
    - **Action:**
        - Modify the existing "Scenario 1: Successful Match & Validation" test or create a new one specifically for fulfillment.
        - **Assertions for Successful Fulfillment:**
            - Verify the `originalTransaction` is `ARCHIVED` and `discarded_at` is set.
            - Verify a `newTransaction` is created with status `POSTED`.
            - Verify `newTransaction.logical_transaction_id` matches `originalTransaction.logical_transaction_id`.
            - Verify `newTransaction.version` is `originalTransaction.version + 1`.
            - Verify `newTransaction` has two `POSTED` entries that are balanced and correctly derived.
            - Verify the `stagingEntry` is `PROCESSED` and its metadata includes `evolved_transaction_id`.
        - Add tests for error handling during the fulfillment process within the `prisma.$transaction` block (e.g., if `createTransactionInternal` for the new transaction fails, the archival of the original transaction should be rolled back).

- [ ] **2.3: Update Memory Bank Documentation**
    - **Files:** `memory-bank/entities/recon-engine.md`, `memory-bank/entities/transactions.md`, `memory-bank/entities/entries.md`, `memory-bank/progress.md`, `memory-bank/activeContext.md`.
    - **Action:**
        - Document the new fulfillment logic in `recon-engine.md`.
        - Update `transactions.md` and `entries.md` to reflect the transaction evolution and archival process.
        - Update `progress.md` and `activeContext.md` upon completion of Phase 2.

<!--
{
  "plan": [
    {
      "id": "P2.1.1",
      "description": "Read src/server/core/recon-engine/engine.js to prepare for modifications.",
      "tool": "read_file",
      "args": { "path": "src/server/core/recon-engine/engine.js" },
      "status": "pending"
    },
    {
      "id": "P2.1.2",
      "description": "Modify processStagingEntryWithRecon: Implement transaction archival and new evolved transaction creation logic.",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/recon-engine/engine.js",
        "diff": "Placeholder for actual diff for fulfillment logic."
      },
      "status": "pending"
    },
    {
      "id": "P2.2.1",
      "description": "Read tests/recon-engine/core/recon-engine-matching.test.js to prepare for test updates.",
      "tool": "read_file",
      "args": { "path": "tests/recon-engine/core/recon-engine-matching.test.js" },
      "status": "pending"
    },
    {
      "id": "P2.2.2",
      "description": "Update/Add Unit Tests for Phase 2 fulfillment logic.",
      "tool": "replace_in_file",
      "args": {
        "path": "tests/recon-engine/core/recon-engine-matching.test.js",
        "diff": "Placeholder for actual diff for new/updated tests."
      },
      "success_condition": "Tests for fulfillment scenarios added and passing.",
      "status": "pending"
    },
    {
      "id": "P2.3.1",
      "description": "Update Memory Bank: recon-engine.md",
      "tool": "read_file",
      "args": { "path": "memory-bank/entities/recon-engine.md" },
      "status": "pending"
    },
    {
      "id": "P2.3.2",
      "description": "Update Memory Bank: transactions.md",
      "tool": "read_file",
      "args": { "path": "memory-bank/entities/transactions.md" },
      "status": "pending"
    },
    {
      "id": "P2.3.3",
      "description": "Update Memory Bank: entries.md",
      "tool": "read_file",
      "args": { "path": "memory-bank/entities/entries.md" },
      "status": "pending"
    },
    {
      "id": "P2.3.4",
      "description": "Update Memory Bank: progress.md and activeContext.md",
      "tool": "read_file",
      "args": { "path": "memory-bank/progress.md" },
      "status": "pending"
    }
  ]
}
-->
