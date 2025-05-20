# Plan: Recon Engine Implementation - Phase 1

This plan outlines the steps to implement the initial phase of the Recon Engine, focusing on the Process Tracker, Producer, and basic Consumer logic.

## Overall Goal
To create a system where `StagingEntry` creation triggers a task in a `ProcessTracker`, and a consumer processes this task to create `Entry` and `Transaction` records.

## Key Components
1.  **Process Tracker:** A new Prisma model and associated logic to manage tasks.
2.  **Producer:** Modification to `createStagingEntry` to add tasks to the `ProcessTracker`.
3.  **Consumer:** A new module/service that polls the `ProcessTracker` and processes tasks.

## Steps

| Done | # | Action                                      | Detail                                                                                                                               |
|------|---|---------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| [ ]  | 1 | Define `ProcessTracker` Prisma Model        | Add `ProcessTracker` model and `ProcessTaskStatus` enum to `prisma/schema.prisma`.                                                   |
| [ ]  | 2 | Define `ProcessTaskType` Enum             | Add `ProcessTaskType` enum (e.g., `PROCESS_STAGING_ENTRY`) to `prisma/schema.prisma`.                                                |
| [ ]  | 3 | Run Prisma Migration                        | Execute `npx prisma migrate dev --name add_process_tracker_table`.                                                                     |
| [ ]  | 4 | Create `ProcessTracker` Core Logic File     | Create `src/server/core/process-tracker/index.js` for task creation, fetching, and updating.                                         |
| [ ]  | 5 | Implement `createTask` in Core Logic      | Add `createTask(task_type, payload)` function to `src/server/core/process-tracker/index.js`.                                         |
| [ ]  | 6 | Implement `getNextPendingTask` Core Logic | Add `getNextPendingTask(task_type)` function to `src/server/core/process-tracker/index.js`.                                          |
| [ ]  | 7 | Implement `updateTaskStatus` Core Logic   | Add `updateTaskStatus(task_id, status, error_details?)` function to `src/server/core/process-tracker/index.js`.                      |
| [ ]  | 8 | Update `activeContext.md` for Process Tracker | Document the new `ProcessTracker` model and its core logic functions.                                                                |
| [ ]  | 9 | Create `process-tracker.md` entity file   | Create `memory-bank/entities/process-tracker.md` detailing the model, enums, and purpose.                                            |
| [ ]  | 10 | Update `index.md` in Memory Bank          | Add link to `process-tracker.md`.                                                                                                    |
| [ ]  | 11 | Modify `createStagingEntry` (Producer)    | In `src/server/core/staging-entry/index.js`, call `createTask` after successful `StagingEntry` creation.                             |
| [ ]  | 12 | Update `staging-entries.md`               | Document the producer behavior in `memory-bank/entities/staging-entries.md`.                                                         |
| [ ]  | 13 | Create Recon Engine Consumer Directory    | Create `src/server/core/recon-engine/`.                                                                                              |
| [ ]  | 14 | Create Consumer Logic File                | Create `src/server/core/recon-engine/consumer.js`.                                                                                   |
| [ ]  | 15 | Implement Consumer Polling Logic          | In `consumer.js`, add logic to periodically call `getNextPendingTask`.                                                               |
| [ ]  | 16 | Implement Staging Entry Processing        | In `consumer.js`, fetch `StagingEntry` based on task payload.                                                                        |
| [ ]  | 17 | Implement `createTransaction` (Internal)  | Add internal `createTransaction` function to `src/server/core/transaction/index.js`.                                                 |
| [ ]  | 18 | Implement `createEntry` (Internal)        | Add internal `createEntry` function to `src/server/core/entry/index.js`.                                                             |
| [ ]  | 19 | Implement Transformation Logic            | In `consumer.js`, transform `StagingEntry` to `Entry` & `Transaction` records using internal create functions.                       |
| [ ]  | 20 | Implement Task & StagingEntry Updates     | In `consumer.js`, update `ProcessTracker` task status and `StagingEntry` status.                                                     |
| [ ]  | 21 | Determine Consumer Execution Strategy     | Decide and document how `consumer.js` will be run (e.g., separate script, cron).                                                     |
| [ ]  | 22 | Update `activeContext.md` for Recon Engine| Document producer, consumer, and execution strategy.                                                                                 |
| [ ]  | 23 | Update `systemPatterns.md`                | Document the new producer-consumer pattern and Process Tracker.                                                                      |
| [ ]  | 24 | Plan Unit/Integration Tests               | Outline test cases for producer, consumer, and Process Tracker interactions.                                                         |

<!--
{
  "planVersion": "1.0",
  "lastUpdated": "2025-05-20T11:53:00Z",
  "plan": [
    {
      "id": 1,
      "action": "Define `ProcessTracker` Prisma Model",
      "tool": "replace_in_file",
      "args": {
        "path": "prisma/schema.prisma",
        "diff": "<<<<<<< SEARCH\n// Add new models above this line or at the end of the file\n=======ADD_MODEL_HERE\n>>>>>>> REPLACE"
      },
      "success": "Prisma schema contains ProcessTracker model and ProcessTaskStatus enum.",
      "status": "pending"
    },
    {
      "id": 2,
      "action": "Define `ProcessTaskType` Enum",
      "tool": "replace_in_file",
      "args": {
        "path": "prisma/schema.prisma",
        "diff": "<<<<<<< SEARCH\n// Add new enums above this line or group them\n=======ADD_ENUM_HERE\n>>>>>>> REPLACE"
      },
      "success": "Prisma schema contains ProcessTaskType enum.",
      "status": "pending"
    },
    {
      "id": 3,
      "action": "Run Prisma Migration",
      "tool": "execute_command",
      "args": {
        "command": "npx prisma migrate dev --name add_process_tracker_table",
        "requires_approval": true
      },
      "success": "Migration applied successfully.",
      "status": "pending"
    },
    {
      "id": 4,
      "action": "Create `ProcessTracker` Core Logic File",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/core/process-tracker/index.js",
        "content": "// Core logic for ProcessTracker\n\nconst prisma = require('../../../services/prisma');\n\nmodule.exports = {};\n"
      },
      "success": "File `src/server/core/process-tracker/index.js` created.",
      "status": "pending"
    },
    {
      "id": 5,
      "action": "Implement `createTask` in Core Logic",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/process-tracker/index.js",
        "diff": "<<<<<<< SEARCH\nmodule.exports = {};\n=======ADD_FUNCTION_HERE\n>>>>>>> REPLACE"
      },
      "success": "`createTask` function exists in core logic.",
      "status": "pending"
    },
    {
      "id": 6,
      "action": "Implement `getNextPendingTask` Core Logic",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/process-tracker/index.js",
        "diff": "<<<<<<< SEARCH\n// Add more functions below\n=======ADD_FUNCTION_HERE\n>>>>>>> REPLACE"
      },
      "success": "`getNextPendingTask` function exists in core logic.",
      "status": "pending"
    },
    {
      "id": 7,
      "action": "Implement `updateTaskStatus` Core Logic",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/process-tracker/index.js",
        "diff": "<<<<<<< SEARCH\n// Add more functions below\n=======ADD_FUNCTION_HERE\n>>>>>>> REPLACE"
      },
      "success": "`updateTaskStatus` function exists in core logic.",
      "status": "pending"
    },
    {
      "id": 8,
      "action": "Update `activeContext.md` for Process Tracker",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/activeContext.md",
        "content": "..."
      },
      "success": "`activeContext.md` updated.",
      "status": "pending"
    },
    {
      "id": 9,
      "action": "Create `process-tracker.md` entity file",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/entities/process-tracker.md",
        "content": "# Entity: Process Tracker..."
      },
      "success": "`memory-bank/entities/process-tracker.md` created.",
      "status": "pending"
    },
    {
      "id": 10,
      "action": "Update `index.md` in Memory Bank",
      "tool": "replace_in_file",
      "args": {
          "path": "memory-bank/index.md",
          "diff": "..."
      },
      "success": "`memory-bank/index.md` updated with link to process-tracker.md.",
      "status": "pending"
    },
    {
      "id": 11,
      "action": "Modify `createStagingEntry` (Producer)",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/staging-entry/index.js",
        "diff": "..."
      },
      "success": "`createStagingEntry` calls `createTask`.",
      "status": "pending"
    },
    {
      "id": 12,
      "action": "Update `staging-entries.md`",
      "tool": "replace_in_file",
      "args": {
          "path": "memory-bank/entities/staging-entries.md",
          "diff": "..."
      },
      "success": "`staging-entries.md` documents producer behavior.",
      "status": "pending"
    },
    {
      "id": 13,
      "action": "Create Recon Engine Consumer Directory",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/core/recon-engine/.keep",
        "content": ""
      },
      "success": "Directory `src/server/core/recon-engine/` created.",
      "status": "pending"
    },
    {
      "id": 14,
      "action": "Create Consumer Logic File",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/core/recon-engine/consumer.js",
        "content": "// Recon Engine Consumer Logic\n\nconst prisma = require('../../../services/prisma');\nconst processTrackerCore = require('../process-tracker');\nconst stagingEntryCore = require('../staging-entry');\nconst transactionCore = require('../transaction');\nconst entryCore = require('../entry');\n\n// Placeholder for consumer logic\nasync function processTasks() {}\n\nmodule.exports = { processTasks };\n"
      },
      "success": "File `src/server/core/recon-engine/consumer.js` created.",
      "status": "pending"
    },
    {
      "id": 15,
      "action": "Implement Consumer Polling Logic",
      "tool": "replace_in_file",
      "args": {"path": "src/server/core/recon-engine/consumer.js", "diff": "..."},
      "success": "Consumer polling logic implemented.",
      "status": "pending"
    },
    {
      "id": 16,
      "action": "Implement Staging Entry Processing",
      "tool": "replace_in_file",
      "args": {"path": "src/server/core/recon-engine/consumer.js", "diff": "..."},
      "success": "Staging Entry fetching implemented.",
      "status": "pending"
    },
    {
      "id": 17,
      "action": "Implement `createTransaction` (Internal)",
      "tool": "replace_in_file",
      "args": {"path": "src/server/core/transaction/index.js", "diff": "..."},
      "success": "Internal `createTransaction` function added.",
      "status": "pending"
    },
    {
      "id": 18,
      "action": "Implement `createEntry` (Internal)",
      "tool": "replace_in_file",
      "args": {"path": "src/server/core/entry/index.js", "diff": "..."},
      "success": "Internal `createEntry` function added.",
      "status": "pending"
    },
    {
      "id": 19,
      "action": "Implement Transformation Logic",
      "tool": "replace_in_file",
      "args": {"path": "src/server/core/recon-engine/consumer.js", "diff": "..."},
      "success": "Transformation logic from StagingEntry to Entry/Transaction implemented.",
      "status": "pending"
    },
    {
      "id": 20,
      "action": "Implement Task & StagingEntry Updates",
      "tool": "replace_in_file",
      "args": {"path": "src/server/core/recon-engine/consumer.js", "diff": "..."},
      "success": "Task and StagingEntry status updates implemented.",
      "status": "pending"
    },
    {
      "id": 21,
      "action": "Determine Consumer Execution Strategy",
      "tool": "ask_followup_question",
      "args": {"question": "How should the consumer process (recon engine core) be run? Options: 1. Separate long-running Node.js script started with `npm run recon-engine`. 2. Cron job invoking a script. 3. Integrated background task within the main Express app (e.g., using a library like `node-cron` or a simple interval).", "options": ["Separate script", "Cron job", "Integrated background task"]},
      "success": "User provides preference for consumer execution.",
      "status": "pending"
    },
    {
      "id": 22,
      "action": "Update `activeContext.md` for Recon Engine",
      "tool": "write_to_file",
      "args": {"path": "memory-bank/activeContext.md", "content": "..."},
      "success": "`activeContext.md` updated.",
      "status": "pending"
    },
    {
      "id": 23,
      "action": "Update `systemPatterns.md`",
      "tool": "replace_in_file",
      "args": {"path": "memory-bank/systemPatterns.md", "diff": "..."},
      "success": "`systemPatterns.md` updated.",
      "status": "pending"
    },
    {
      "id": 24,
      "action": "Plan Unit/Integration Tests",
      "tool": "write_to_file",
      "args": {"path": "memory-bank/plans/2025-05-20-recon-engine-tests.md", "content": "# Test Plan: Recon Engine..."},
      "success": "Test plan created.",
      "status": "pending"
    }
  ]
}
-->
