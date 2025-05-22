# Active Context: Smart Ledger Backend (Node.js) - Refined File Ingestion Types

**Current Focus:**
- **File Ingestion API Refinement:** Updated the file ingestion logic (`ingestStagingEntriesFromFile` in `src/server/core/staging-entry/index.js`) to accept "DEBIT" or "CREDIT" (case-insensitive) as transaction types from CSV files. 'Chargeback' has been removed as a directly accepted CSV type for ingestion, simplifying the accepted types to 'Payment', 'Refund', 'DEBIT', and 'CREDIT'.
- **Testing:** No direct unit tests were run for this specific change. Manual verification or API-level tests with updated CSV files would be needed.

**Key Decisions & Changes (File Ingestion API Refinement):**
1.  **Core Logic Update (`src/server/core/staging-entry/index.js`):**
    *   Modified `ingestStagingEntriesFromFile`:
        *   Updated CSV `type` field validation to accept 'Payment', 'Refund', 'DEBIT', 'CREDIT' (case-insensitive). 'Chargeback' is no longer in this explicit list.
        *   Prioritized direct use of `EntryType.DEBIT` or `EntryType.CREDIT` if the CSV `type` is 'DEBIT' or 'CREDIT'.
        *   Maintained fallback logic to determine `EntryType` based on `account.account_type` for CSV types 'Payment' and 'Refund'. The internal mapping for 'Chargeback' (if it was similar to 'Refund') has been removed from this specific CSV ingestion logic.
2.  **Memory Bank Updates:**
    *   `memory-bank/progress.md` (Will be updated).
    *   This `activeContext.md` file.
    *   `memory-bank/entities/staging-entries.md` (Will be updated to reflect new accepted types).

**Previous Context (List Entries API Enhancement - Still Relevant Foundation):**
- **List Entries API Enhancement:** Updated the "List Entries" API (`GET /accounts/{accountId}/entries`) to include the status of the associated transaction in the response.
    - Core logic in `src/server/core/entry/index.js` updated.
    - Swagger documentation in `src/server/routes/entry/index.js` updated.

**Previous Context (Recon Rule Selection Refinement - Still Relevant Foundation):**
- **Recon Rule Selection Logic Refinement:** Completed implementation and testing of changes to ensure the Recon Engine selects the correct `ReconRule` based on the `StagingEntryProcessingMode` and the role of the account in the rule.
    - In `TRANSACTION` mode (generating new expectations), the engine now specifically looks for a rule where `stagingEntry.account_id` is `account_one_id`.
    - In `CONFIRMATION` mode (fulfilling existing expectations), the engine now specifically looks for a rule where `stagingEntry.account_id` is `account_two_id`.
- **Testing (Recon Rule):** Unit tests for `src/server/core/recon-engine/engine.js` were updated and passed, confirming the new rule selection logic.

**Previous Context (File Type Processing Modes Feature - Still Relevant Foundation):**
- **"File Type Processing Modes" Feature:** This feature is foundational to the current changes.
    - Added `StagingEntryProcessingMode` enum (`CONFIRMATION`, `TRANSACTION`).
    - Added `processing_mode` to `StagingEntry` model (default `CONFIRMATION`).
    - Updated Staging Entry creation and file ingestion APIs to handle `processing_mode`.
    - Recon Engine (`processStagingEntryWithRecon`) branches logic based on `processing_mode`.

**Previous Context (Consumer Polling Interval - Still Relevant):**
- Recon Engine consumer polling interval is configurable via `RECON_ENGINE_POLL_INTERVAL_MS`, defaulting to 1 second.

**Next Steps (Broader - carried over, still relevant):**
-   Consider more complex matching rules for the Recon Engine.
-   Implement logic for partial matching/fulfillment.
-   Explore N-way reconciliation scenarios.
-   Performance optimization for large datasets.
-   Develop a User Interface for managing `NEEDS_MANUAL_REVIEW` items.
