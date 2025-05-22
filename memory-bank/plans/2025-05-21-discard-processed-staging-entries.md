# Plan: Discard Processed Staging Entries

**Date:** 2025-05-21
**Objective:** Modify the Recon Engine so that `StagingEntry` records have their `discarded_at` field set to the current timestamp once they are processed (status becomes `PROCESSED` or `NEEDS_MANUAL_REVIEW`).

## Steps
| Done | # | Action                                                                 | Detail                                                                                                                                                                                             |
|------|---|------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [x]  | 1 | Create plan file                                                       | `memory-bank/plans/2025-05-21-discard-processed-staging-entries.md` (this file)                                                                                                                    |
| [ ]  | 2 | Modify `processStagingEntryWithRecon` in recon engine                  | Edit `src/server/core/recon-engine/engine.js` to set `discarded_at: new Date()` for `StagingEntry` updates to `PROCESSED` or `NEEDS_MANUAL_REVIEW`.                                                 |
| [ ]  | 3 | Review existing tests for `StagingEntry` processing                    | Read `tests/recon-engine/core/recon-engine-matching.test.js`.                                                                                                                                      |
| [ ]  | 4 | Update tests to verify `discarded_at`                                  | Edit `tests/recon-engine/core/recon-engine-matching.test.js` to assert `stagingEntry.discarded_at` is set.                                                                                         |
| [ ]  | 5 | Run all tests                                                          | Execute `npm test`.                                                                                                                                                                                |
| [ ]  | 6 | Update Memory Bank documentation                                       | Update `memory-bank/entities/staging-entries.md` and `memory-bank/entities/recon-engine.md`.                                                                                                       |

<!--
{
  "plan": [
    {
      "id": 1,
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/plans/2025-05-21-discard-processed-staging-entries.md",
        "content": "# Plan: Discard Processed Staging Entries\n\n**Date:** 2025-05-21\n**Objective:** Modify the Recon Engine so that `StagingEntry` records have their `discarded_at` field set to the current timestamp once they are processed (status becomes `PROCESSED` or `NEEDS_MANUAL_REVIEW`).\n\n## Steps\n| Done | # | Action                                                                 | Detail                                                                                                                                                                                             |\n|------|---|------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|\n| [x]  | 1 | Create plan file                                                       | `memory-bank/plans/2025-05-21-discard-processed-staging-entries.md` (this file)                                                                                                                    |\n| [ ]  | 2 | Modify `processStagingEntryWithRecon` in recon engine                  | Edit `src/server/core/recon-engine/engine.js` to set `discarded_at: new Date()` for `StagingEntry` updates to `PROCESSED` or `NEEDS_MANUAL_REVIEW`.                                                 |\n| [ ]  | 3 | Review existing tests for `StagingEntry` processing                    | Read `tests/recon-engine/core/recon-engine-matching.test.js`.                                                                                                                                      |\n| [ ]  | 4 | Update tests to verify `discarded_at`                                  | Edit `tests/recon-engine/core/recon-engine-matching.test.js` to assert `stagingEntry.discarded_at` is set.                                                                                         |\n| [ ]  | 5 | Run all tests                                                          | Execute `npm test`.                                                                                                                                                                                |\n| [ ]  | 6 | Update Memory Bank documentation                                       | Update `memory-bank/entities/staging-entries.md` and `memory-bank/entities/recon-engine.md`.                                                                                                       |\n\n<!--\n{ \"plan\":[ ... actual JSON plan ... ] }\n-->"
      },
      "success": "Plan file created.",
      "status": "success"
    },
    {
      "id": 2,
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/recon-engine/engine.js",
        "diff": "<<<<<<< SEARCH\n            status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,\n            metadata: { ...stagingEntry.metadata, error: 'Ambiguous match: Multiple expected entries found.', error_type: 'AmbiguousMatchError' }\n          },\n=======\n            status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,\n            discarded_at: new Date(),\n            metadata: { ...stagingEntry.metadata, error: 'Ambiguous match: Multiple expected entries found.', error_type: 'AmbiguousMatchError' }\n          },\n>>>>>>> REPLACE\n\n<<<<<<< SEARCH\n            data: {\n              status: StagingEntryStatus.PROCESSED,\n              metadata: {\n=======\n            data: {\n              status: StagingEntryStatus.PROCESSED,\n              discarded_at: new Date(),\n              metadata: {\n>>>>>>> REPLACE\n\n<<<<<<< SEARCH\n            data: { \n              status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,\n              metadata: { ...stagingEntry.metadata, error: mismatchReason, error_type: 'MismatchError', matched_transaction_id: originalTransaction.transaction_id }\n            },\n=======\n            data: { \n              status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,\n              discarded_at: new Date(),\n              metadata: { ...stagingEntry.metadata, error: mismatchReason, error_type: 'MismatchError', matched_transaction_id: originalTransaction.transaction_id }\n            },\n>>>>>>> REPLACE\n\n<<<<<<< SEARCH\n        data: { status: StagingEntryStatus.PROCESSED },\n      });\n=======\n        data: { status: StagingEntryStatus.PROCESSED, discarded_at: new Date() },\n      });\n>>>>>>> REPLACE\n\n<<<<<<< SEARCH\n          where: { staging_entry_id: stagingEntry.staging_entry_id },\n          data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, metadata: { ...currentMetadata, error: error.message, error_type: error.name } },\n        });\n=======\n          where: { staging_entry_id: stagingEntry.staging_entry_id },\n          data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, discarded_at: new Date(), metadata: { ...currentMetadata, error: error.message, error_type: error.name } },\n        });\n>>>>>>> REPLACE\n\n<<<<<<< SEARCH\n          where: { staging_entry_id: stagingEntry.staging_entry_id },\n          data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, metadata: { ...currentMetadata, error: error.message, error_type: error.name || 'GenericError' } },\n        });\n=======\n          where: { staging_entry_id: stagingEntry.staging_entry_id },\n          data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, discarded_at: new Date(), metadata: { ...currentMetadata, error: error.message, error_type: error.name || 'GenericError' } },\n        });\n>>>>>>> REPLACE"
      },
      "success": "Recon engine logic updated to set discarded_at.",
      "status": "pending"
    },
    {
      "id": 3,
      "tool": "read_file",
      "args": { "path": "tests/recon-engine/core/recon-engine-matching.test.js" },
      "success": "Test file content retrieved.",
      "status": "pending"
    },
    {
      "id": 4,
      "tool": "replace_in_file",
      "args": {
        "path": "tests/recon-engine/core/recon-engine-matching.test.js",
        "diff": "[Specific diff to be constructed after reviewing the test file]"
      },
      "success": "Test file updated with assertions for stagingEntry.discarded_at.",
      "status": "pending"
    },
    {
      "id": 5,
      "tool": "execute_command",
      "args": { "command": "npm test", "requires_approval": false },
      "success": "Test suite executed, all tests pass.",
      "status": "pending"
    },
    {
      "id": 6,
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/entities/staging-entries.md",
        "content": "[Content to be updated to reflect discarded_at behavior]"
      },
      "success": "staging-entries.md updated.",
      "status": "pending"
    },
    {
      "id": 7,
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/entities/recon-engine.md",
        "content": "[Content to be updated to reflect discarded_at behavior]"
      },
      "success": "recon-engine.md updated.",
      "status": "pending"
    }
  ]
}
-->
