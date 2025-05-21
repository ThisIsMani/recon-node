# Plan: Phase 1 - Staging Entry Core Matching Logic & Mismatch State

**Date:** 2025-05-20

**Overall Task:** Implement Staging Entry Matching & Transaction Evolution

**Phase Goal:** Implement the ability for an incoming `StagingEntry` to find a potential `EXPECTED Entry` and determine if it's a valid match or a mismatch. For this phase, a valid match will log success and update the `StagingEntry` status appropriately. A mismatch will update the `StagingEntry` and the original `Transaction` states. The actual transaction archival and new version creation (fulfillment) will be handled in Phase 2.

**Key File to Modify:** `src/server/core/recon-engine/engine.js` (primarily `processStagingEntryWithRecon`)

---

## Steps for Phase 1

- [ ] **1.1: Add `MISMATCH` to `TransactionStatus` Enum (if not already present) and migrate**
    - **File:** `prisma/schema.prisma`
    - **Action:** Verify `TransactionStatus` enum includes `MISMATCH`. If not, add it.
    - **Command:** Run `npx prisma generate`.
    - **Command:** Run `npx prisma migrate dev --name add_transaction_mismatch_status_phase1` to create and apply the migration if schema was changed.

- [ ] **1.2: Enhance `processStagingEntryWithRecon` - Matching & Validation Logic**
    - **File:** `src/server/core/recon-engine/engine.js`
    - **Action:**
        - Modify the `processStagingEntryWithRecon` function.
        - **Matching Phase:**
            - Before the existing logic (which generates a new expectation), add a section to attempt to find a matching `EXPECTED` entry.
            - Query the `Entry` table for records where:
                - `status` is `EntryStatus.EXPECTED`.
                - `account_id` matches `currentStagingEntry.account_id`.
                - The `merchant_id` of the associated `Transaction` matches the `merchantId` parameter.
                - `metadata.order_id` (from `Entry.metadata`) matches `currentStagingEntry.metadata.order_id`.
            - Include the parent `Transaction` (with its entries) in the query result.
            - Handle cases:
                - **No match found:** Proceed to the "Generate New" logic (existing functionality).
                - **Multiple matches found:** Log a warning, set `StagingEntry` status to `NEEDS_MANUAL_REVIEW`, and throw an error to stop further processing for this entry.
        - **Validation Phase (if a unique `matchedExpectedEntry` and its `originalTransaction` are found):**
            - Compare `currentStagingEntry.amount` with `matchedExpectedEntry.amount`.
            - Compare `currentStagingEntry.currency` with `matchedExpectedEntry.currency`.
            - Verify `currentStagingEntry.entry_type` is the logical fulfillment of `matchedExpectedEntry.entry_type` (e.g., if `matchedExpectedEntry.entry_type` is `CREDIT`, `currentStagingEntry.entry_type` should be `DEBIT` for the same account, or more accurately, it should be the type that balances the *other* leg of the original transaction).

- [ ] **1.3: Enhance `processStagingEntryWithRecon` - Conditional Outcome Logic (Phase 1)**
    - **File:** `src/server/core/recon-engine/engine.js`
    - **Action:** Implement the conditional logic based on the matching and validation outcome:
        - **If Match & Valid:**
            - Log a success message: "StagingEntry [ID] matched with ExpectedEntry [ID] from Transaction [ID]. Phase 1: Match validated. Fulfillment will be handled in Phase 2."
            - Update `currentStagingEntry.status` to `StagingEntryStatus.PROCESSED`.
            - Add `matched_transaction_id` and `matched_entry_id` to `currentStagingEntry.metadata`.
            - The `matchedExpectedEntry` and `originalTransaction` remain unchanged in this phase.
            - Return a specific object indicating `MATCHED_PENDING_FULFILLMENT` along with relevant IDs.
        - **If Match but Invalid (Mismatch):**
            - Atomically update `originalTransaction.status` to `TransactionStatus.MISMATCH`.
            - Update `currentStagingEntry.status` to `StagingEntryStatus.NEEDS_MANUAL_REVIEW`.
            - Add error details (e.g., "Mismatch on amount for order_id X") and `matched_transaction_id` to `currentStagingEntry.metadata`.
            - Throw an error to indicate mismatch and stop further processing for this entry.
        - **If No Match Found:**
            - The function should proceed to the existing "Generate New" logic (calling `generateTransactionEntriesFromStaging` and `transactionCore.createTransactionInternal`).

- [ ] **1.4: Unit Tests for Phase 1**
    - **File:** `tests/recon-engine/core/recon-engine-matching.test.js` (or a new dedicated file like `recon-engine-matching.test.js`).
    *   **Test Scenarios:**
        *   **Scenario 1: Successful Match & Validation (Phase 1 behavior):**
            *   Setup: A `StagingEntry` and a pre-existing `EXPECTED` `Entry` (with its `Transaction`) that matches on `order_id`, `account_id`, `amount`, `currency`, and `entry_type` logic.
            *   Action: Call `processStagingEntryWithRecon`.
            *   Assert: `StagingEntry` status is `PROCESSED`, metadata includes match details. Log message indicates a successful match. Original `EXPECTED` entry and `Transaction` are NOT modified in Phase 1. The function returns a `MATCHED_PENDING_FULFILLMENT` status.
        *   **Scenario 2: Mismatch (e.g., Amount Differs):**
            *   Setup: Similar to above, but `amount` differs.
            *   Action: Call `processStagingEntryWithRecon`.
            *   Assert: `StagingEntry` status is `NEEDS_MANUAL_REVIEW` with appropriate error in metadata. Original `Transaction` status is `MISMATCH`.
        *   **Scenario 3: No Match Found (Fallback to Generate New):**
            *   Setup: A `StagingEntry` with no corresponding `EXPECTED` entry.
            *   Action: Call `processStagingEntryWithRecon`.
            *   Assert: A new `Transaction` is created with one `POSTED` and one `EXPECTED` entry. The `StagingEntry` status is `PROCESSED`. (This verifies existing functionality isn't broken).
        *   **Scenario 4: Ambiguous Match (Multiple Expected Entries):**
            *   Setup: Two `EXPECTED` entries that could match the `StagingEntry` based on `order_id` and `account_id`.
            *   Action: Call `processStagingEntryWithRecon`.
            *   Assert: `StagingEntry` status is `NEEDS_MANUAL_REVIEW` with an appropriate error message.

- [ ] **1.5: Update Memory Bank Documentation**
    - **Files:** `memory-bank/entities/recon-engine.md`, `memory-bank/entities/transactions.md`, `memory-bank/progress.md`, `memory-bank/activeContext.md`.
    - **Action:**
        - Document the new matching logic within `processStagingEntryWithRecon` in `recon-engine.md`.
        - Add the `MISMATCH` status to `transactions.md` (if not already present).
        - Update `progress.md` with the start and completion of Phase 1.
        - Update `activeContext.md` to reflect the current work on Phase 1.

<!--
{
  "plan": [
    {
      "id": "P1.1.1",
      "description": "Verify and potentially add MISMATCH to TransactionStatus Enum in Prisma schema.",
      "tool": "read_file",
      "args": { "path": "prisma/schema.prisma" },
      "status": "pending"
    },
    {
      "id": "P1.1.2",
      "description": "Run Prisma Generate and Migrate if schema was changed for TransactionStatus.",
      "tool": "execute_command",
      "args": {
        "command": "npx prisma generate && npx prisma migrate dev --name add_transaction_mismatch_status_phase1",
        "requires_approval": true
      },
      "success_condition": "Prisma client is regenerated and migration applied if necessary.",
      "status": "pending"
    },
    {
      "id": "P1.2.1",
      "description": "Read src/server/core/recon-engine/engine.js to prepare for modifications.",
      "tool": "read_file",
      "args": { "path": "src/server/core/recon-engine/engine.js" },
      "status": "pending"
    },
    {
      "id": "P1.2.2",
      "description": "Modify processStagingEntryWithRecon: Implement query to find matching EXPECTED entries and validation logic.",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/recon-engine/engine.js",
        "diff": "Placeholder for actual diff for matching and validation logic."
      },
      "status": "pending"
    },
    {
      "id": "P1.2.3",
      "description": "Modify processStagingEntryWithRecon: Implement conditional outcome logic for 'Match & Valid', 'Mismatch', and 'No Match'.",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/recon-engine/engine.js",
        "diff": "Placeholder for actual diff for conditional outcome logic."
      },
      "status": "pending"
    },
    {
      "id": "P1.3.1",
      "description": "Create/Update Unit Tests for Phase 1 matching logic.",
      "tool": "write_to_file",
      "args": {
        "path": "tests/recon-engine/core/recon-engine-matching.test.js",
        "content": "// Test cases for Phase 1: Staging Entry Matching\n// - Test successful match and validation (logging/status update)\n// - Test mismatch scenario (Transaction status MISMATCH, StagingEntry NEEDS_MANUAL_REVIEW)\n// - Test no match scenario (fallback to 'Generate New' logic)\n// - Test scenario with multiple potential matches (if applicable, ensure correct error handling or selection logic)"
      },
      "success_condition": "Test file created/updated with stubs for new test cases.",
      "status": "pending"
    },
    {
      "id": "P1.4.1",
      "description": "Update Memory Bank: recon-engine.md",
      "tool": "read_file",
      "args": { "path": "memory-bank/entities/recon-engine.md" },
      "status": "pending"
    },
    {
      "id": "P1.4.2",
      "description": "Update Memory Bank: transactions.md",
      "tool": "read_file",
      "args": { "path": "memory-bank/entities/transactions.md" },
      "status": "pending"
    },
    {
      "id": "P1.4.3",
      "description": "Update Memory Bank: progress.md and activeContext.md",
      "tool": "read_file",
      "args": { "path": "memory-bank/progress.md" },
      "status": "pending"
    }
  ]
}
-->
