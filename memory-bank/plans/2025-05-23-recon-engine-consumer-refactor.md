## Plan: Refactor Recon Engine Consumer to Use Task System

**Date:** 2025-05-23

**Objective:** Refactor `src/server/core/recon-engine/consumer.ts` to utilize the existing task system architecture (`TaskManager`, `TransactionCreationTask`, `ExpectedEntryMatchingTask`) instead of directly calling `engine.processStagingEntryWithRecon`. This will improve modularity, reduce duplication, and align with the intended design.

## Steps

- [ ] **1. Read `consumer.ts` for current state analysis.**
      - Tool: `read_file`
      - Args: `{"path": "src/server/core/recon-engine/consumer.ts"}`
- [ ] **2. Refactor `consumer.ts` to use Task System.**
      - Tool: `replace_in_file`
      - Args: Modify `processSingleTask` to uncomment TaskManager initialization and use `taskManager.process()`.
      - Policy: Adhere to existing error handling patterns for `ProcessTracker` and `StagingEntry`.
- [ ] **3. Review `engine.ts` for any necessary adjustments.**
      - Tool: `read_file`
      - Args: `{"path": "src/server/core/recon-engine/engine.ts"}`
      - Note: Focus on ensuring clear responsibility for `StagingEntry` status updates, avoiding duplication with task layer.
- [ ] **4. Review `matching-task.ts` for adjustments.**
      - Tool: `read_file`
      - Args: `{"path": "src/server/core/recon-engine/task/matching-task.ts"}`
- [ ] **5. Review `transaction-task.ts` for adjustments.**
      - Tool: `read_file`
      - Args: `{"path": "src/server/core/recon-engine/task/transaction-task.ts"}`
      - Note (for steps 3-5): If changes are needed, subsequent `replace_in_file` steps will be added.
- [ ] **6. Run initial tests.**
      - Tool: `execute_command`
      - Args: `{"command": "npm test", "requires_approval": "false"}`
      - Policy: `test-execution-policy.md`
- [ ] **7. Fix failing tests and add new tests if required.**
      - Tool: `replace_in_file` (for test files like `consumer.test.ts`, etc.)
      - Policy: `test-coverage-policy.md`
- [ ] **8. Update Memory Bank: `entities/recon-engine.md`.**
      - Tool: `replace_in_file`
      - Args: Update content to reflect consumer's use of task system.
      - Policy: `memory-bank-interaction.md`
- [ ] **9. Update Memory Bank: `activeContext.md`.**
      - Tool: `replace_in_file` (or `write_to_file` if appending is complex)
      - Args: Add summary of this refactoring task.
      - Policy: `memory-bank-interaction.md`
- [ ] **10. Update Memory Bank: `progress.md`.**
      - Tool: `replace_in_file` (or `write_to_file`)
      - Args: Log completion of this task.
      - Policy: `memory-bank-interaction.md`
- [ ] **11. Final test run.**
      - Tool: `execute_command`
      - Args: `{"command": "npm test", "requires_approval": "false"}`
      - Policy: `test-execution-policy.md`

<!--
{
  "planName": "2025-05-23-recon-engine-consumer-refactor",
  "plan": [
    {
      "id": 1,
      "description": "Read consumer.ts for current state analysis.",
      "tool": "read_file",
      "args": {"path": "src/server/core/recon-engine/consumer.ts"},
      "success_condition": "file_content_obtained",
      "status": "pending"
    },
    {
      "id": 2,
      "description": "Refactor consumer.ts to use Task System.",
      "tool": "replace_in_file",
      "args": {"path": "src/server/core/recon-engine/consumer.ts", "diff": "TBD_IMPLEMENTATION_DETAILS"},
      "success_condition": "file_modified_successfully",
      "status": "pending"
    },
    {
      "id": 3,
      "description": "Review engine.ts for any necessary adjustments.",
      "tool": "read_file",
      "args": {"path": "src/server/core/recon-engine/engine.ts"},
      "success_condition": "file_content_obtained",
      "status": "pending"
    },
    {
      "id": 4,
      "description": "Review matching-task.ts for adjustments.",
      "tool": "read_file",
      "args": {"path": "src/server/core/recon-engine/task/matching-task.ts"},
      "success_condition": "file_content_obtained",
      "status": "pending"
    },
    {
      "id": 5,
      "description": "Review transaction-task.ts for adjustments.",
      "tool": "read_file",
      "args": {"path": "src/server/core/recon-engine/task/transaction-task.ts"},
      "success_condition": "file_content_obtained",
      "status": "pending"
    },
    {
      "id": 6,
      "description": "Run initial tests.",
      "tool": "execute_command",
      "args": {"command": "npm test", "requires_approval": "false"},
      "success_condition": "command_executed_tests_pass_or_fail",
      "status": "pending"
    },
    {
      "id": 7,
      "description": "Fix failing tests and add new tests if required.",
      "tool": "replace_in_file",
      "args": {"path": "TBD_test_file.ts", "diff": "TBD_IMPLEMENTATION_DETAILS"},
      "success_condition": "file_modified_successfully",
      "status": "pending"
    },
    {
      "id": 8,
      "description": "Update Memory Bank: entities/recon-engine.md.",
      "tool": "replace_in_file",
      "args": {"path": "memory-bank/entities/recon-engine.md", "diff": "TBD_DOC_UPDATE_DETAILS"},
      "success_condition": "file_modified_successfully",
      "status": "pending"
    },
    {
      "id": 9,
      "description": "Update Memory Bank: activeContext.md.",
      "tool": "replace_in_file",
      "args": {"path": "memory-bank/activeContext.md", "diff": "TBD_APPEND_SUMMARY"},
      "success_condition": "file_modified_successfully",
      "status": "pending"
    },
    {
      "id": 10,
      "description": "Update Memory Bank: progress.md.",
      "tool": "replace_in_file",
      "args": {"path": "memory-bank/progress.md", "diff": "TBD_APPEND_LOG"},
      "success_condition": "file_modified_successfully",
      "status": "pending"
    },
    {
      "id": 11,
      "description": "Final test run.",
      "tool": "execute_command",
      "args": {"command": "npm test", "requires_approval": "false"},
      "success_condition": "command_executed_tests_pass",
      "status": "pending"
    }
  ]
}
-->
