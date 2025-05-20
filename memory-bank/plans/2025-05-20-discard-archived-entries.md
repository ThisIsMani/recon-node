# Plan: Explicitly Discard Entries of Archived Transactions

**Date:** 2025-05-20
**Objective:** Modify the Recon Engine so that when an original transaction is archived (due to its `EXPECTED` entry being fulfilled), all `Entry` records within that original transaction have their `discarded_at` field set to the current timestamp, while their original `status` (e.g., `EXPECTED`, `POSTED`) is preserved.

**Tasks:**

*   [ ] **1. Modify Recon Engine Logic:**
    *   Action: Edit `src/server/core/recon-engine/engine.js`.
    *   Detail: In the "Phase 2 Fulfillment" `prisma.$transaction` block, after updating the `originalTransaction` to `ARCHIVED` and setting its `discarded_at`, add a step to update all `Entry` records belonging to this `originalTransaction`. This update should set their `discarded_at` field to the current timestamp but leave their existing `status` unchanged.
    *   JSON for internal tracking:
        ```json
        {
          "id": 1,
          "tool": "replace_in_file",
          "args": {
            "path": "src/server/core/recon-engine/engine.js",
            "diff": "<<<<<<< SEARCH\n          });\n          logger.info(`[ReconEngine] Archived original transaction ${originalTransaction.transaction_id}`);\n\n          // b. Prepare Data for the New Evolved Transaction\n=======\n          });\n          logger.info(`[ReconEngine] Archived original transaction ${originalTransaction.transaction_id}`);\n\n          // Update discarded_at for all entries of the original transaction\n          await tx.entry.updateMany({\n            where: { transaction_id: originalTransaction.transaction_id },\n            data: {\n              discarded_at: new Date(),\n            },\n          });\n          logger.info(`[ReconEngine] Marked all entries as discarded for original transaction ${originalTransaction.transaction_id}`);\n\n          // b. Prepare Data for the New Evolved Transaction\n>>>>>>> REPLACE"
          },
          "success": "File content updated with new logic for entries.",
          "status": "pending"
        }
        ```

*   [ ] **2. Review Existing Tests:**
    *   Action: Read and analyze `tests/recon-engine/core/recon-engine-matching.test.js`.
    *   Detail: Identify relevant test cases, particularly those covering the "Phase 2 Fulfillment" scenario where an `EXPECTED` entry is matched and its transaction is archived. Understand how entries of the archived transaction are currently asserted.
    *   JSON for internal tracking:
        ```json
        {
          "id": 2,
          "tool": "read_file",
          "args": { "path": "tests/recon-engine/core/recon-engine-matching.test.js" },
          "success": "Test file content retrieved.",
          "status": "pending"
        }
        ```

*   [ ] **3. Update Tests:**
    *   Action: Edit `tests/recon-engine/core/recon-engine-matching.test.js`.
    *   Detail: Modify existing assertions or add new ones to verify that:
        *   The `discarded_at` field is correctly populated for all entries of the archived original transaction.
        *   The original `status` (e.g., `EXPECTED`, `POSTED`) of these entries is preserved.
    *   JSON for internal tracking:
        ```json
        {
          "id": 3,
          "tool": "replace_in_file",
          "args": {
            "path": "tests/recon-engine/core/recon-engine-matching.test.js",
            "diff": "[Specific diff to be constructed after reviewing the test file]"
          },
          "success": "Test file updated with new assertions for entry.discarded_at and preserved entry.status.",
          "status": "pending"
        }
        ```

*   [ ] **4. Run All Tests:**
    *   Action: Execute the test suite.
    *   Detail: Run `npm test` to ensure all tests pass, including the newly modified ones, and that no regressions have been introduced.
    *   JSON for internal tracking:
        ```json
        {
          "id": 4,
          "tool": "execute_command",
          "args": { "command": "npm test", "requires_approval": false },
          "success": "Test suite executed, all tests pass.",
          "status": "pending"
        }
        ```

*   [ ] **5. Update Memory Bank Documentation (Conceptual):**
    *   Action: Mentally note changes for `memory-bank/entities/entries.md` and `memory-bank/entities/recon-engine.md`.
    *   Detail: The documentation should be updated to reflect that entries within an archived transaction will have their `discarded_at` field set while retaining their original operational status.
    *   JSON for internal tracking:
        ```json
        {
          "id": 5,
          "tool": "none",
          "args": {},
          "success": "Documentation changes noted.",
          "status": "pending"
        }
