# Plan: Framework Improvements (2025-05-23)

This plan outlines the steps to improve the framework in four key areas:
1.  Logging
2.  Error Propagation
3.  DB Functions Consistency
4.  Abstracting out common utilities

## Phase 1: Logging Enhancements

-   [ ] **1.1 Analyze existing logger:** Read `src/services/logger.ts` and identify current usage patterns.
-   [ ] **1.2 Research & Select Library:** Evaluate robust logging libraries (e.g., Winston, Pino) suitable for Node.js/TypeScript, considering features like log levels, structured logging (JSON), and context injection.
-   [ ] **1.3 Design Enhanced Logger:** Define requirements for the new logger (levels, structure, context parameters like request ID).
-   [ ] **1.4 Implement New Logger Service:** Refactor `src/services/logger.ts` to integrate the chosen library and implement the designed features.
-   [ ] **1.5 Update Application-wide Logging:** Replace existing logging calls with the new logger service.
-   [ ] **1.6 Add Request Context Middleware:** Implement Express middleware to inject request-specific context (e.g., request ID) into logs.
-   [ ] **1.7 Test Logging:** Write unit tests for the logger service and ensure integration works as expected.
-   [ ] **1.8 Document Logging:** Update Memory Bank (`techContext.md` or a new `logging.md`) with details about the new logging setup.

## Phase 2: Error Propagation Improvements

-   [ ] **2.1 Analyze Current Error Handling:** Review `src/app.ts` (global error handler), custom errors, and error handling in core modules and routes.
-   [ ] **2.2 Define Standard Error Structure:** Design a base `AppError` class and conventions for custom error types, including HTTP status codes and error codes.
-   [ ] **2.3 Refactor Custom Errors:** Update existing custom errors (e.g., `NoReconRuleFoundError`, `BalanceError`) to extend the base `AppError`.
-   [ ] **2.4 Enhance Global Error Handler:** Modify the global error handler in `src/app.ts` to consistently process `AppError` instances and send standardized error responses.
-   [ ] **2.5 Review & Refactor Module-Level Error Handling:** Ensure consistent error throwing and catching across core services and route handlers.
-   [ ] **2.6 Test Error Handling:** Add/update tests for various error scenarios, ensuring correct propagation and response codes.
-   [ ] **2.7 Document Error Handling:** Update Memory Bank (`systemPatterns.md` or a new `errorHandling.md`).

## Phase 3: DB Functions Consistency

-   [ ] **3.1 Analyze Prisma Usage:** Review how Prisma Client is used in all `src/server/core/**/*.ts` files.
-   [ ] **3.2 Identify Common Query Patterns:** Look for repeated query structures, "not found" handling, etc.
-   [ ] **3.3 Develop DB Helper Utilities (if beneficial):**
    -   Consider creating generic helper functions in `src/services/database.ts` or entity-specific data access layers (e.g., `src/server/data_access/<entity>/index.ts`).
    -   Examples: `findEntityOrThrow(model, query)`, `ensureUnique(model, data, field)`.
-   [ ] **3.4 Establish Prisma Query Conventions:** Document best practices for select/include, transaction usage, and error handling for DB operations.
-   [ ] **3.5 Refactor DB Calls:** Update existing database interactions to use new helpers and adhere to conventions.
-   [ ] **3.6 Test DB Functions:** Ensure refactored DB logic is covered by tests.
-   [ ] **3.7 Document DB Practices:** Update Memory Bank (`systemPatterns.md` or `techContext.md`).

## Phase 4: Abstraction of Common Utilities

-   [ ] **4.1 Code Review for Repetition:** Systematically review `src/server/core/**/*.ts` and `src/server/routes/**/*.ts` for duplicated code blocks or logic.
-   [ ] **4.2 Identify Abstraction Candidates:** Pinpoint specific pieces of logic suitable for utility functions, helper classes, or custom middleware.
-   [ ] **4.3 Design and Implement Abstractions:**
    -   Create/enhance `src/utils/` directory and files.
    -   Develop new Express middleware if applicable.
-   [ ] **4.4 Refactor Code to Use Abstractions:** Replace duplicated logic with calls to the new utilities/middleware.
-   [ ] **4.5 Test Abstractions:** Write unit tests for new utility functions and middleware.
-   [ ] **4.6 Document New Utilities:** Update Memory Bank (`systemPatterns.md` or create `utils.md`).

## Phase 5: Final Review and Testing

-   [ ] **5.1 Run All Tests:** Execute `npm test` to ensure all changes pass.
-   [ ] **5.2 Manual Smoke Testing (Optional):** Perform basic API calls to verify core functionality.
-   [ ] **5.3 Update Memory Bank:** Final review of all Memory Bank documents impacted by these framework changes. Append a summary to `activeContext.md` and `progress.md`.

<!--
{
  "plan": [
    {
      "id": "1.1", "description": "Analyze existing logger", "tool": "read_file",
      "args": {"path": "src/services/logger.ts"},
      "success": "file_read", "status": "pending"
    },
    {
      "id": "1.2", "description": "Research & Select Library", "tool": "ask_user",
      "args": {"question": "For logging, do you have a preferred library (e.g., Winston, Pino) or specific features in mind (e.g., JSON output, log rotation, transport to external services)?"},
      "success": "user_response", "status": "pending"
    },
    {
      "id": "1.3", "description": "Design Enhanced Logger", "tool": "plan_mode_respond",
      "args": {"response": "Based on library selection and features, I will draft a design for the enhanced logger."},
      "success": "design_drafted", "status": "pending"
    },
    {
      "id": "1.4", "description": "Implement New Logger Service", "tool": "replace_in_file",
      "args": {"path": "src/services/logger.ts", "diff": "TBD"},
      "success": "file_updated", "status": "pending"
    },
    {
      "id": "1.5", "description": "Update Application-wide Logging", "tool": "replace_in_file",
      "args": {"path": "multiple_files", "diff": "TBD_via_search_files"},
      "success": "files_updated", "status": "pending"
    },
    {
      "id": "1.6", "description": "Add Request Context Middleware", "tool": "write_to_file",
      "args": {"path": "src/server/middleware/requestContextLogger.ts", "content": "TBD"},
      "success": "file_written", "status": "pending"
    },
    {
      "id": "1.7", "description": "Test Logging", "tool": "execute_command",
      "args": {"command": "npm test tests/services/logger.test.ts", "requires_approval": false},
      "success": "tests_pass", "status": "pending"
    },
    {
      "id": "1.8", "description": "Document Logging", "tool": "replace_in_file",
      "args": {"path": "memory-bank/techContext.md", "diff": "TBD"},
      "success": "memory_updated", "status": "pending"
    },
    {
      "id": "2.1", "description": "Analyze Current Error Handling", "tool": "read_file",
      "args": {"path": "src/app.ts"}, "success": "file_read", "status": "pending"
    },
    {
      "id": "2.2", "description": "Define Standard Error Structure", "tool": "plan_mode_respond",
      "args": {"response": "I will propose a standard AppError class structure."},
      "success": "structure_defined", "status": "pending"
    },
    {
      "id": "2.3", "description": "Refactor Custom Errors", "tool": "replace_in_file",
      "args": {"path": "src/server/core/**/errors.ts", "diff": "TBD_via_search_files"},
      "success": "files_updated", "status": "pending"
    },
    {
      "id": "2.4", "description": "Enhance Global Error Handler", "tool": "replace_in_file",
      "args": {"path": "src/app.ts", "diff": "TBD"},
      "success": "file_updated", "status": "pending"
    },
    {
      "id": "2.5", "description": "Review & Refactor Module-Level Error Handling", "tool": "replace_in_file",
      "args": {"path": "multiple_files", "diff": "TBD_via_search_files"},
      "success": "files_updated", "status": "pending"
    },
    {
      "id": "2.6", "description": "Test Error Handling", "tool": "execute_command",
      "args": {"command": "npm test", "requires_approval": false},
      "success": "tests_pass", "status": "pending"
    },
    {
      "id": "2.7", "description": "Document Error Handling", "tool": "replace_in_file",
      "args": {"path": "memory-bank/systemPatterns.md", "diff": "TBD"},
      "success": "memory_updated", "status": "pending"
    },
    {
      "id": "3.1", "description": "Analyze Prisma Usage", "tool": "search_files",
      "args": {"path": "src/server/core", "regex": "prisma\\.", "file_pattern": "*.ts"},
      "success": "search_complete", "status": "pending"
    },
    {
      "id": "3.2", "description": "Identify Common Query Patterns", "tool": "plan_mode_respond",
      "args": {"response": "Based on search results, I will identify common Prisma query patterns."},
      "success": "patterns_identified", "status": "pending"
    },
    {
      "id": "3.3", "description": "Develop DB Helper Utilities", "tool": "write_to_file",
      "args": {"path": "src/services/databaseHelpers.ts", "content": "TBD"},
      "success": "file_written", "status": "pending"
    },
    {
      "id": "3.4", "description": "Establish Prisma Query Conventions", "tool": "plan_mode_respond",
      "args": {"response": "I will document Prisma query conventions."},
      "success": "conventions_documented", "status": "pending"
    },
    {
      "id": "3.5", "description": "Refactor DB Calls", "tool": "replace_in_file",
      "args": {"path": "multiple_files", "diff": "TBD_via_search_files"},
      "success": "files_updated", "status": "pending"
    },
    {
      "id": "3.6", "description": "Test DB Functions", "tool": "execute_command",
      "args": {"command": "npm test", "requires_approval": false},
      "success": "tests_pass", "status": "pending"
    },
    {
      "id": "3.7", "description": "Document DB Practices", "tool": "replace_in_file",
      "args": {"path": "memory-bank/systemPatterns.md", "diff": "TBD"},
      "success": "memory_updated", "status": "pending"
    },
    {
      "id": "4.1", "description": "Code Review for Repetition", "tool": "search_files",
      "args": {"path": "src", "regex": "TBD_common_patterns", "file_pattern": "*.ts"},
      "success": "search_complete", "status": "pending"
    },
    {
      "id": "4.2", "description": "Identify Abstraction Candidates", "tool": "plan_mode_respond",
      "args": {"response": "Based on review, I will identify candidates for abstraction."},
      "success": "candidates_identified", "status": "pending"
    },
    {
      "id": "4.3", "description": "Design and Implement Abstractions", "tool": "write_to_file",
      "args": {"path": "src/utils/newUtil.ts", "content": "TBD"},
      "success": "file_written", "status": "pending"
    },
    {
      "id": "4.4", "description": "Refactor Code to Use Abstractions", "tool": "replace_in_file",
      "args": {"path": "multiple_files", "diff": "TBD_via_search_files"},
      "success": "files_updated", "status": "pending"
    },
    {
      "id": "4.5", "description": "Test Abstractions", "tool": "execute_command",
      "args": {"command": "npm test tests/utils/newUtil.test.ts", "requires_approval": false},
      "success": "tests_pass", "status": "pending"
    },
    {
      "id": "4.6", "description": "Document New Utilities", "tool": "replace_in_file",
      "args": {"path": "memory-bank/systemPatterns.md", "diff": "TBD"},
      "success": "memory_updated", "status": "pending"
    },
    {
      "id": "5.1", "description": "Run All Tests", "tool": "execute_command",
      "args": {"command": "npm test", "requires_approval": false},
      "success": "tests_pass", "status": "pending"
    },
    {
      "id": "5.2", "description": "Manual Smoke Testing", "tool": "ask_user",
      "args": {"question": "Would you like to perform any manual smoke tests before concluding?"},
      "success": "user_response", "status": "pending"
    },
    {
      "id": "5.3", "description": "Update Memory Bank", "tool": "replace_in_file",
      "args": {"path": "memory-bank/activeContext.md", "diff": "TBD_summary"},
      "success": "memory_updated", "status": "pending"
    }
  ]
}
-->
