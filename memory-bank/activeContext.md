# Active Context: Smart Ledger Backend (Node.js) - Recon Engine Behavior & `discarded_at` Logic Updated

**Current Focus:**
- Recon Engine's "no match found" behavior for `StagingEntry` processing has been updated:
    - If no matching `EXPECTED` entry is found, the `StagingEntry` status is set to `NEEDS_MANUAL_REVIEW`, and a `NoMatchFoundError` is thrown. No new transaction is automatically created.
- The logic for setting `StagingEntry.discarded_at` has been corrected:
    - `discarded_at` is **NOT** set when a `StagingEntry` status becomes `NEEDS_MANUAL_REVIEW` (for any reason: no match, mismatch, ambiguous match, or other processing errors).
    - `discarded_at` **IS** set only when a `StagingEntry` status becomes `PROCESSED` (e.g., after successful Phase 2 fulfillment).
- All relevant unit tests in `tests/recon-engine/` have been updated to reflect these changes, and all 152 tests are passing (one test previously relevant to auto-creation on no-match was removed, three others were refactored).
- Memory Bank documentation (`entities/staging-entries.md`, `entities/recon-engine.md`) updated.

**Key Decisions & Changes (Recon Engine Behavior & `discarded_at`):**
1.  **Engine Logic Update (`src/server/core/recon-engine/engine.js`):**
    *   Modified `processStagingEntryWithRecon` so that if no matching `EXPECTED` entry is found, it updates the `StagingEntry` to `NEEDS_MANUAL_REVIEW` (without `discarded_at`) and throws `NoMatchFoundError`.
    *   Ensured `discarded_at` is not set in other `NEEDS_MANUAL_REVIEW` scenarios (mismatch, ambiguous match, general error handling in the main catch block).
    *   Confirmed `discarded_at` is set when `StagingEntry` status becomes `PROCESSED` during successful Phase 2 fulfillment.
2.  **Unit Test Updates:**
    *   `tests/recon-engine/core/recon-engine-matching.test.js`: Adjusted assertions for `Scenario 3: No Match Found` to expect rejection and correct status/`discarded_at` (null). Verified `discarded_at` logic for other `NEEDS_MANUAL_REVIEW` and `PROCESSED` states. Ensured test setups correctly create pre-existing `EXPECTED` entries for match/mismatch scenarios.
    *   `tests/recon-engine/core/recon-engine.js`: Removed one test that was no longer valid due to the "no match" logic change. Refactored other tests to correctly mock conditions for fulfillment phase errors and check `discarded_at`.
3.  **Memory Bank Updates:**
    *   `memory-bank/entities/staging-entries.md`: Updated lifecycle description for `discarded_at`.
    *   `memory-bank/entities/recon-engine.md`: Updated data flow and error handling descriptions.
    *   `memory-bank/progress.md` (Will be updated to log completion of this task).
    *   This `activeContext.md` file.

**Previous Context (Consumer Polling Interval - Still Relevant):**
- Recon Engine consumer polling interval is configurable via `RECON_ENGINE_POLL_INTERVAL_MS`, defaulting to 1 second.

**Previous Context (File Ingestion API - Still Relevant):**
- CSV File Ingestion API for `StagingEntry` creation is complete.

**Next Steps (Broader - carried over, still relevant):**
-   Consider more complex matching rules for the Recon Engine.
-   Implement logic for partial matching/fulfillment.
-   Explore N-way reconciliation scenarios.
-   Performance optimization for large datasets.
-   Develop a User Interface for managing `NEEDS_MANUAL_REVIEW` items.
