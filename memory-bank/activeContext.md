# Active Context: Smart Ledger Backend (Node.js) - Entry Archival & StagingEntry PENDING Status

**Current Focus:**
- **Entry Archival:** When a `Transaction` is archived by the Recon Engine (during Phase 2 fulfillment), its constituent `Entry` records now also have their status updated to `EntryStatus.ARCHIVED` and their `discarded_at` field set.
- **StagingEntry Status:**
    - Added `PENDING` to the `StagingEntryStatus` enum in `prisma/schema.prisma`.
    - `PENDING` is now the default status for newly created `StagingEntry` records.
- Recon Engine's "no match found" behavior for `StagingEntry` processing remains: if no matching `EXPECTED` entry is found, the `StagingEntry` status is set to `NEEDS_MANUAL_REVIEW`, and a `NoMatchFoundError` is thrown.
- The logic for setting `StagingEntry.discarded_at` remains: `discarded_at` is **NOT** set for `NEEDS_MANUAL_REVIEW` and **IS** set for `PROCESSED`.
- All relevant unit tests have been updated, and all 152 tests are passing.
- Memory Bank documentation (`entities/staging-entries.md`, `entities/recon-engine.md`, `entities/entries.md`) updated.

**Key Decisions & Changes (Entry Archival & StagingEntry PENDING):**
1.  **Prisma Schema Update (`prisma/schema.prisma`):**
    *   Added `PENDING` to `StagingEntryStatus` enum.
    *   Set `@default(PENDING)` for `StagingEntry.status`.
2.  **Engine Logic Update (`src/server/core/recon-engine/engine.js`):**
    *   During Phase 2 fulfillment, when archiving an `originalTransaction`, the `updateMany` call for its entries now also sets `status: EntryStatus.ARCHIVED`.
    *   (Previous changes for "no match" behavior and `StagingEntry.discarded_at` logic are maintained).
3.  **Unit Test Updates:**
    *   `tests/recon-engine/core/recon-engine-matching.test.js`: `Scenario 1` now asserts that original entries are `ARCHIVED`.
    *   `tests/staging-entry/staging-entry.js`: API tests now assert that new staging entries default to `PENDING`.
4.  **Memory Bank Updates:**
    *   `memory-bank/entities/entries.md`: Updated to reflect that entries of archived transactions are marked `ARCHIVED`.
    *   `memory-bank/entities/staging-entries.md`: Added `PENDING` status and updated default status.
    *   `memory-bank/entities/recon-engine.md`: Updated Phase 2 fulfillment description.
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
