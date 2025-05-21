# Plan: File Ingestion API for Staging Entries

**Date:** 2025-05-21
**Objective:** Create an API endpoint to ingest CSV files, parse their records, transform them into `StagingEntry` objects, and create these entries in the system.

## Pre-requisites
-   The `Account` model in `prisma/schema.prisma` must have an `account_type` field (e.g., ENUM `AccountType { DEBIT CREDIT }`). If not present, this needs to be added and migrated first. (Assuming this exists or will be handled).

## CSV File Columns Expected:
-   `order_id`
-   `amount` (Numeric)
-   `currency` (String, e.g., "USD")
-   `transaction_date` (Date/Timestamp string, parsable by `new Date()`)
-   `type` (String: "Payment" or "Refund")

## API Endpoint
-   **Method:** `POST`
-   **Path:** `/api/accounts/:account_id/staging-entries/files`
-   **Request:** `multipart/form-data` with a file field (e.g., `file`).
-   **Response:**
    -   `200 OK` or `207 Multi-Status` on partial success:
        ```json
        {
          "message": "File processing complete.",
          "successful_ingestions": 5,
          "failed_ingestions": 1,
          "errors": [
            {
              "row_number": 3, // Original row number in CSV
              "error_details": "Missing required field: amount",
              "row_data": { /* original row data */ }
            }
          ]
        }
        ```
    -   `400 Bad Request` for invalid `account_id`, file format issues, or other general request errors.
    -   `404 Not Found` if the `account_id` does not exist.
    -   `500 Internal Server Error` for unexpected server issues.

## Steps

| Done | # | Action                                                                 | Detail                                                                                                                                                                                                                                                           |
|------|---|------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [ ]  | 1 | **Setup Dependencies**                                                 | Install `multer` for file uploads and `csv-parser` for CSV processing: `npm install multer csv-parser`.                                                                                                                                                            |
| [ ]  | 2 | **Define API Route & Controller Stub**                                 | In `src/server/routes/staging-entry/index.js`, add the `POST /api/accounts/:account_id/ingest-file` route. Create a corresponding controller function stub in `src/server/core/staging-entry/index.js` (e.g., `ingestStagingEntriesFromFile`).                 |
| [ ]  | 3 | **Implement File Upload Middleware**                                   | Use `multer` in the route definition to handle `multipart/form-data` and make the uploaded file available (e.g., in `req.file`). Configure `multer` for CSV files and appropriate size limits.                                                                   |
| [ ]  | 4 | **Implement CSV Parsing Logic**                                        | In the `ingestStagingEntriesFromFile` core function: Use `csv-parser` to stream and parse the uploaded CSV file from `req.file.buffer` or `req.file.path` (if saved to disk by multer).                                                                        |
| [ ]  | 5 | **Implement Row Transformation & Validation**                          | For each row from the CSV: <br> a. Validate presence of required fields (`amount`, `currency`, `transaction_date`, `type`, `order_id`). <br> b. Validate data types (e.g., `amount` is numeric, `transaction_date` is a valid date).                               |
| [ ]  | 6 | **Fetch Account Type**                                                 | Before processing rows, fetch the `Account` details using `account_id` from the path to get its `account_type` (DEBIT/CREDIT). If account not found, return 404.                                                                                             |
| [ ]  | 7 | **Determine `EntryType` (DEBIT/CREDIT)**                             | Based on the fetched `Account.account_type` and the file's `type` column ("Payment" or "Refund"): <br> - If Account is DEBIT: "Payment" -> DEBIT, "Refund" -> CREDIT. <br> - If Account is CREDIT: "Payment" -> CREDIT, "Refund" -> DEBIT.                   |
| [ ]  | 8 | **Construct `StagingEntry` Data**                                      | For each valid row, create a `StagingEntry` data object: <br> - `account_id`: from path. <br> - `entry_type`: Determined in step 7. <br> - `amount`: From CSV. <br> - `currency`: From CSV. <br> - `effective_date`: From CSV `transaction_date`. <br> - `metadata`: `{ "order_id": "value_from_csv", "source_file": "original_filename.csv" }`. |
| [ ]  | 9 | **Create Staging Entries**                                             | For each constructed `StagingEntry` data object, call the existing `stagingEntryCore.createStagingEntry(accountId, entryData)`. This will also trigger the Recon Engine task. Collect successes and failures.                                                    |
| [ ]  | 10| **Aggregate Results & Send Response**                                  | After processing all rows, compile a summary of successful ingestions, failed ingestions, and detailed errors for failed rows. Send the appropriate HTTP response (e.g., 207 Multi-Status).                                                                    |
| [ ]  | 11| **Error Handling**                                                     | Implement robust error handling for file read errors, CSV parsing errors, validation failures, and database errors during `Account` fetch or `StagingEntry` creation.                                                                                           |
| [ ]  | 12| **Write Unit/Integration Tests**                                       | In `tests/staging-entry/staging-entry.js` (or a new file), add tests for the `/api/accounts/:account_id/ingest-file` endpoint. Cover valid CSV, CSV with errors, non-existent account, etc.                                                                 |
| [ ]  | 13| **Update API Documentation (Swagger)**                                 | Add JSDoc comments to the new route handler in `src/server/routes/staging-entry/index.js` so Swagger documentation is generated.                                                                                                                               |
| [ ]  | 14| **Update Memory Bank**                                                 | Update `memory-bank/entities/staging-entries.md` with details of the new API endpoint. Update `memory-bank/activeContext.md` and `memory-bank/progress.md` upon completion.                                                                                 |

<!--
{
  "planName": "File Ingestion API for Staging Entries",
  "date": "2025-05-21",
  "objective": "Create an API endpoint to ingest CSV files, parse their records, transform them into StagingEntry objects, and create these entries in the system.",
  "prerequisites": [
    "The Account model in prisma/schema.prisma must have an account_type field (e.g., ENUM AccountType { DEBIT CREDIT }). If not present, this needs to be added and migrated first."
  ],
  "csvExpectedColumns": ["order_id", "amount", "currency", "transaction_date", "type"],
  "apiEndpoint": {
    "method": "POST",
    "path": "/api/accounts/:account_id/ingest-file",
    "requestType": "multipart/form-data",
    "fileField": "file"
  },
  "steps": [
    {
      "id": 1,
      "action": "Setup Dependencies",
      "detail": "Install multer for file uploads and csv-parser for CSV processing: npm install multer csv-parser.",
      "tool": "execute_command",
      "args_template": {"command": "npm install multer csv-parser", "requires_approval": true},
      "success_criteria": "Command executes successfully, packages added to package.json and node_modules.",
      "status": "pending"
    },
    {
      "id": 2,
      "action": "Define API Route & Controller Stub",
      "detail": "In src/server/routes/staging-entry/index.js, add the POST /api/accounts/:account_id/staging-entries/files route. Create a corresponding controller function stub in src/server/core/staging-entry/index.js (e.g., ingestStagingEntriesFromFile).",
      "tool": "replace_in_file",
      "args_template": {
        "path_route": "src/server/routes/staging-entry/index.js",
        "path_core": "src/server/core/staging-entry/index.js"
      },
      "success_criteria": "Route and core function stub created.",
      "status": "pending"
    },
    {
      "id": 3,
      "action": "Implement File Upload Middleware",
      "detail": "Use multer in the route definition to handle multipart/form-data and make the uploaded file available. Configure multer for CSV files and appropriate size limits.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/routes/staging-entry/index.js"},
      "success_criteria": "Multer middleware correctly configured and applied to the route.",
      "status": "pending"
    },
    {
      "id": 4,
      "action": "Implement CSV Parsing Logic",
      "detail": "In the ingestStagingEntriesFromFile core function: Use csv-parser to stream and parse the uploaded CSV file.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/core/staging-entry/index.js"},
      "success_criteria": "CSV file is successfully parsed into processable records.",
      "status": "pending"
    },
    {
      "id": 5,
      "action": "Implement Row Transformation & Validation",
      "detail": "For each row from the CSV: validate required fields and data types.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/core/staging-entry/index.js"},
      "success_criteria": "Rows are validated; invalid rows are identified.",
      "status": "pending"
    },
    {
      "id": 6,
      "action": "Fetch Account Type",
      "detail": "Before processing rows, fetch the Account details using account_id from the path to get its account_type. If account not found, return 404.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/core/staging-entry/index.js"},
      "success_criteria": "Account type (DEBIT/CREDIT) is successfully fetched or 404 is appropriately handled.",
      "status": "pending"
    },
    {
      "id": 7,
      "action": "Determine EntryType (DEBIT/CREDIT)",
      "detail": "Based on the fetched Account.account_type and the file's type column ('Payment' or 'Refund'), determine StagingEntry.entry_type.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/core/staging-entry/index.js"},
      "success_criteria": "Correct EntryType (DEBIT/CREDIT) is determined for each row.",
      "status": "pending"
    },
    {
      "id": 8,
      "action": "Construct StagingEntry Data",
      "detail": "For each valid row, create a StagingEntry data object including all necessary fields and metadata.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/core/staging-entry/index.js"},
      "success_criteria": "StagingEntry data objects are correctly constructed.",
      "status": "pending"
    },
    {
      "id": 9,
      "action": "Create Staging Entries",
      "detail": "For each constructed StagingEntry data object, call stagingEntryCore.createStagingEntry. Collect successes and failures.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/core/staging-entry/index.js"},
      "success_criteria": "Staging entries are created; successes and failures are tracked.",
      "status": "pending"
    },
    {
      "id": 10,
      "action": "Aggregate Results & Send Response",
      "detail": "After processing all rows, compile a summary and send the appropriate HTTP response.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/core/staging-entry/index.js"},
      "success_criteria": "Correct summary response is sent to the client.",
      "status": "pending"
    },
    {
      "id": 11,
      "action": "Error Handling",
      "detail": "Implement robust error handling throughout the process.",
      "tool": "replace_in_file",
      "args_template": {"path_route": "src/server/routes/staging-entry/index.js", "path_core": "src/server/core/staging-entry/index.js"},
      "success_criteria": "Errors are caught and handled gracefully, providing informative responses.",
      "status": "pending"
    },
    {
      "id": 12,
      "action": "Write Unit/Integration Tests",
      "detail": "In tests/staging-entry/staging-entry.js, add tests for the /api/accounts/:account_id/staging-entries/files endpoint. Cover valid CSV, CSV with errors, non-existent account, etc.",
      "tool": "write_to_file",
      "args_template": {"path": "tests/staging-entry/staging-entry.js"},
      "success_criteria": "Comprehensive tests are written and pass.",
      "status": "pending"
    },
    {
      "id": 13,
      "action": "Update API Documentation (Swagger)",
      "detail": "Add JSDoc comments to the new route handler for Swagger documentation.",
      "tool": "replace_in_file",
      "args_template": {"path": "src/server/routes/staging-entry/index.js"},
      "success_criteria": "API documentation is updated and accurate.",
      "status": "pending"
    },
    {
      "id": 14,
      "action": "Update Memory Bank",
      "detail": "Update memory-bank/entities/staging-entries.md, memory-bank/activeContext.md, and memory-bank/progress.md.",
      "tool": "write_to_file",
      "args_template": {
        "path_staging_entries_md": "memory-bank/entities/staging-entries.md",
        "path_active_context_md": "memory-bank/activeContext.md",
        "path_progress_md": "memory-bank/progress.md",
        "path_plan_file": "memory-bank/plans/2025-05-21-file-ingestion-api.md"
      },
      "success_criteria": "Memory Bank documents are updated.",
      "status": "pending"
    }
  ]
}
-->
