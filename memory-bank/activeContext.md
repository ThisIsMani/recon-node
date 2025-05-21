# Active Context: Smart Ledger Backend (Node.js) - Consumer Polling Interval Updated

**Current Focus:**
- Recon Engine consumer polling interval is now configurable via the `RECON_ENGINE_POLL_INTERVAL_MS` environment variable.
- Default polling interval changed from 5 seconds to 1 second.
- Relevant files (`consumer.js`, `.env.example`, `.env.test`) updated.
- Memory Bank documentation (`techContext.md`, `recon-engine.md`) updated to reflect this change.

**Key Decisions & Changes (Consumer Polling Interval):**
1.  **Consumer Logic Update (`src/server/core/recon-engine/consumer.js`):**
    *   The `startConsumer` function now reads `process.env.RECON_ENGINE_POLL_INTERVAL_MS`.
    *   Defaults to 1000ms (1 second) if the environment variable is not set or invalid.
2.  **Environment File Updates:**
    *   `.env.example`: Added `RECON_ENGINE_POLL_INTERVAL_MS=1000`.
    *   `.env.test`: Added `RECON_ENGINE_POLL_INTERVAL_MS=1000`.
3.  **Memory Bank Updates:**
    *   `memory-bank/techContext.md`: Documented the new `RECON_ENGINE_POLL_INTERVAL_MS` environment variable.
    *   `memory-bank/entities/recon-engine.md`: Updated the consumer description to mention the configurable polling interval.
    *   `memory-bank/progress.md` (Will be updated to log completion of this task).
    *   This `activeContext.md` file.

**Previous Context (StagingEntry Discard Logic - Still Relevant):**
- Recon Engine now sets `discarded_at` for `StagingEntry` records when they are processed (status `PROCESSED` or `NEEDS_MANUAL_REVIEW`).
- All related unit tests (158 total) are passing.

**Previous Context (File Ingestion API - Still Relevant):**
- CSV File Ingestion API for `StagingEntry` creation is complete, path: `POST /api/accounts/:account_id/staging-entries/files`.

**Next Steps (Broader - carried over, still relevant):**
-   Consider more complex matching rules for the Recon Engine.
-   Implement logic for partial matching/fulfillment.
-   Explore N-way reconciliation scenarios.
-   Performance optimization for large datasets (especially relevant for file ingestion).
-   Develop a User Interface for managing `NEEDS_MANUAL_REVIEW` items and visualizing reconciliation.
-   Address any remaining low code coverage areas if deemed necessary.
-   Added `start:consumer` script to `package.json` for easier execution of the Recon Engine consumer.
-   Ensured `dotenv` is initialized at the top of `src/server.js` to correctly load environment variables for the main server.
-   Updated `README.md` with instructions on how to run the Recon Engine consumer.
