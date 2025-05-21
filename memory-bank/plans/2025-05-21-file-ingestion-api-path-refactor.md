# Plan: Refactor File Ingestion API Path to `/files`

**Date:** 2025-05-21
**Objective:** Change the API endpoint path for CSV file ingestion from `/api/accounts/:account_id/staging-entries/ingest-file` to `/api/accounts/:account_id/staging-entries/files`.

## Affected Files:
-   `src/server/routes/staging-entry/index.js` (Route definition and Swagger docs)
-   `tests/staging-entry/staging-entry.js` (Test paths)
-   `memory-bank/entities/staging-entries.md` (Documentation)
-   `memory-bank/activeContext.md` (Documentation)
-   `memory-bank/progress.md` (Documentation)
-   `memory-bank/plans/2025-05-21-file-ingestion-api.md` (Original plan file, to note the path change)

## Checklist:

-   [ ] **1. Update Route Definition:**
    -   **File:** `src/server/routes/staging-entry/index.js`
    -   **Change:** Modify the route path from `/ingest-file` to `/files`.
    -   **Detail:** `router.post('/ingest-file', ...)` becomes `router.post('/files', ...)`.

-   [ ] **2. Update Swagger Documentation:**
    -   **File:** `src/server/routes/staging-entry/index.js`
    -   **Change:** Update the JSDoc comments for the endpoint to reflect the new path `/accounts/{account_id}/staging-entries/files`.

-   [ ] **3. Update API Tests:**
    -   **File:** `tests/staging-entry/staging-entry.js`
    -   **Change:** In the `describe` block for `POST /api/accounts/:account_id/ingest-file` (this description will also need updating), update all request paths from `/api/accounts/:account_id/staging-entries/ingest-file` to `/api/accounts/:account_id/staging-entries/files`.

-   [ ] **4. Run Tests:**
    -   **Action:** Execute `npm test` to ensure all tests, especially those in `tests/staging-entry/staging-entry.js`, pass with the new path.

-   [ ] **5. Update Memory Bank - Entity File:**
    -   **File:** `memory-bank/entities/staging-entries.md`
    -   **Change:** Update the API Endpoints section to list the new path: `POST /api/accounts/:account_id/staging-entries/files`.

-   [ ] **6. Update Memory Bank - Original Plan:**
    -   **File:** `memory-bank/plans/2025-05-21-file-ingestion-api.md`
    -   **Change:** Add a note or update the API endpoint path in the original plan to reflect this refactor.

-   [ ] **7. Update Memory Bank - Active Context & Progress:**
    -   **Files:** `memory-bank/activeContext.md`, `memory-bank/progress.md`
    -   **Change:** Document the completion of this path refactoring task.

<!--
{
  "planName": "Refactor File Ingestion API Path to /files",
  "date": "2025-05-21",
  "objective": "Change the API endpoint path for CSV file ingestion from /api/accounts/:account_id/staging-entries/ingest-file to /api/accounts/:account_id/staging-entries/files.",
  "steps": [
    {
      "id": 1,
      "action": "Update Route Definition",
      "detail": "File: src/server/routes/staging-entry/index.js. Change: Modify the route path from /ingest-file to /files.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/routes/staging-entry/index.js", "search_pattern": "/ingest-file", "replace_pattern": "/files"},
      "success_criteria": "Route path updated to /files.",
      "status": "pending"
    },
    {
      "id": 2,
      "action": "Update Swagger Documentation",
      "detail": "File: src/server/routes/staging-entry/index.js. Change: Update JSDoc comments for the endpoint path.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/routes/staging-entry/index.js", "search_pattern": "/accounts/{account_id}/staging-entries/ingest-file", "replace_pattern": "/accounts/{account_id}/staging-entries/files"},
      "success_criteria": "Swagger documentation path updated.",
      "status": "pending"
    },
    {
      "id": 3,
      "action": "Update API Tests",
      "detail": "File: tests/staging-entry/staging-entry.js. Change: Update all request paths from /ingest-file to /staging-entries/files. Update describe block name.",
      "tool": "replace_in_file",
      "args_template": {"path": "tests/staging-entry/staging-entry.js", "search_pattern": "/ingest-file", "replace_pattern": "/staging-entries/files"},
      "success_criteria": "Test paths and describe block updated.",
      "status": "pending"
    },
    {
      "id": 4,
      "action": "Run Tests",
      "detail": "Execute npm test to ensure all tests pass.",
      "tool": "execute_command",
      "args_template": {"command": "npm test", "requires_approval": false},
      "success_criteria": "All tests pass.",
      "status": "pending"
    },
    {
      "id": 5,
      "action": "Update Memory Bank - Entity File",
      "detail": "File: memory-bank/entities/staging-entries.md. Change: Update API Endpoints section.",
      "tool": "replace_in_file",
      "args_template": {"path": "memory-bank/entities/staging-entries.md", "search_pattern": "/ingest-file", "replace_pattern": "/files"},
      "success_criteria": "Entity documentation updated.",
      "status": "pending"
    },
    {
      "id": 6,
      "action": "Update Memory Bank - Original Plan",
      "detail": "File: memory-bank/plans/2025-05-21-file-ingestion-api.md. Change: Note or update API path.",
      "tool": "replace_in_file",
      "args_template": {"path": "memory-bank/plans/2025-05-21-file-ingestion-api.md", "search_pattern": "/ingest-file", "replace_pattern": "/files"},
      "success_criteria": "Original plan documentation updated.",
      "status": "pending"
    },
    {
      "id": 7,
      "action": "Update Memory Bank - Active Context & Progress",
      "detail": "Files: memory-bank/activeContext.md, memory-bank/progress.md. Change: Document completion of refactoring.",
      "tool": "write_to_file",
      "args_template": {
          "path_active_context": "memory-bank/activeContext.md",
          "path_progress": "memory-bank/progress.md",
          "path_plan_file": "memory-bank/plans/2025-05-21-file-ingestion-api-path-refactor.md"
      },
      "success_criteria": "Active context and progress log updated.",
      "status": "pending"
    }
  ]
}
-->
