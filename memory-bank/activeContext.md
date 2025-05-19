# Active Context: Smart Ledger Backend (Node.js) (Staging Entry API Nested & Refined)

**Current Focus:**
- Refinement of the Staging Entry API to be nested under accounts and removal of update endpoint.

**Key Decisions & Outcomes (Staging Entry API Refinement):**
- **Database:** Schema remains the same for `StagingEntry` model.
- **API Endpoints:**
  - Changed to `POST /api/accounts/:account_id/staging-entries` for creating entries. `account_id` is now a path parameter.
  - Changed to `GET /api/accounts/:account_id/staging-entries` for listing entries.
  - The `PUT /api/staging-entries/:staging_entry_id/status` endpoint was REMOVED.
- **Core Logic:**
  - `createStagingEntry` in `src/server/core/staging-entry/index.js` now accepts `account_id` as a direct parameter.
  - `listStagingEntries` in `src/server/core/staging-entry/index.js` now accepts `account_id` as a direct parameter and filters by it.
  - `updateStagingEntryStatus` function was REMOVED.
- **Routing:** Main router and staging entry router updated for new nested paths. `mergeParams: true` enabled on staging entry router.
- **Documentation:**
  - Swagger API documentation (JSDoc in routes) updated for new paths and parameters.
  - Memory Bank entity file `memory-bank/entities/staging-entries.md` updated.
- **Testing:** Tests in `tests/staging-entry/staging-entry.js` updated for new paths and removal of PUT endpoint tests. All tests are passing.

**Next Steps (High-Level, post this task):**
1.  Update `memory-bank/progress.md` to log the completion of the Staging Entry API (nested POST/GET, no update API).
2.  Discuss and plan the database schema and APIs for final "Entries" and "Transactions" (which will represent the actual ledger movements).
3.  Implement API endpoints for creating and managing these final entries and transactions (potentially including a way to update StagingEntry status as part of processing into a final Entry, if not directly via API).
4.  Implement logic for on-the-fly balance calculations on `Account` based on final `Entry` records.
5.  Write API tests for new final Entry and Transaction endpoints.
6.  Address TODOs from previous phases (e.g., more robust input validation across all APIs, balance check on account deletion).
7.  Begin design/implementation of the "recon engine" that utilizes `ReconRule`s to create "expected entries" (which might be a type of `StagingEntry` initially or directly a final `Entry`).
