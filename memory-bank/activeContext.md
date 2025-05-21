# Active Context: Smart Ledger Backend (Node.js) - Conditional Recon Matching & Entry/Staging Status Updates

**Current Focus:**
- **Conditional Recon Matching:** The Recon Engine (`processStagingEntryWithRecon`) now only attempts to match a `StagingEntry` against existing `EXPECTED` entries if the `StagingEntry.account_id` is `account_two_id` in an active `ReconRule`. Otherwise, the match attempt is bypassed, and the `StagingEntry` is flagged for manual review.
- **Entry Archival:** When a `Transaction` is archived by the Recon Engine (during Phase 2 fulfillment), its constituent `Entry` records now also have their status updated to `EntryStatus.ARCHIVED` and their `discarded_at` field set.
- **StagingEntry Status:**
    - `PENDING` is the default status for newly created `StagingEntry` records.
- Recon Engine's "no match found" behavior for `StagingEntry` processing (when a match is attempted but fails, or when a match is bypassed) results in `NEEDS_MANUAL_REVIEW` status and a `NoMatchFoundError`.
- The logic for setting `StagingEntry.discarded_at` remains: `discarded_at` is **NOT** set for `NEEDS_MANUAL_REVIEW` and **IS** set for `PROCESSED`.
- All relevant unit tests have been updated to reflect these changes, and all 152 tests are passing.
- Memory Bank documentation (`entities/staging-entries.md`, `entities/recon-engine.md`, `entities/entries.md`, `entities/recon-rules.md`) updated.

**Key Decisions & Changes (Conditional Matching, Entry Archival, StagingEntry PENDING):**
1.  **Prisma Schema Update (`prisma/schema.prisma`):**
    *   Added `PENDING` to `StagingEntryStatus` enum.
    *   Set `@default(PENDING)` for `StagingEntry.status`.
2.  **Engine Logic Update (`src/server/core/recon-engine/engine.js`):**
    *   Implemented conditional matching: Fetches `ReconRule`. Only attempts to match if rule exists and `stagingEntry.account_id === reconRule.account_two_id`. Otherwise, throws `NoMatchFoundError`.
    *   During Phase 2 fulfillment, when archiving an `originalTransaction`, the `updateMany` call for its entries now also sets `status: EntryStatus.ARCHIVED`.
3.  **Unit Test Updates:**
    *   `tests/recon-engine/core/recon-engine-matching.test.js`: Updated scenarios for conditional matching. Added tests for bypassed matching. Ensured `effective_date` is present in test data. `Scenario 1` asserts original entries are `ARCHIVED`.
    *   `tests/recon-engine/core/recon-engine.js`: Added `ReconRule` setup for fulfillment tests to ensure matching path is taken.
    *   `tests/staging-entry/staging-entry.js`: API tests now assert that new staging entries default to `PENDING`.
4.  **Memory Bank Updates:**
    *   `memory-bank/entities/entries.md`: Updated for `ARCHIVED` status of entries.
    *   `memory-bank/entities/staging-entries.md`: Added `PENDING` status.
    *   `memory-bank/entities/recon-engine.md`: Detailed conditional matching logic.
    *   `memory-bank/entities/recon-rules.md`: Clarified implied roles of `account_one_id` and `account_two_id`.
    *   `memory-bank/progress.md` (Will be updated).
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
