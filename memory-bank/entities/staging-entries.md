# Entity: Staging Entries (`StagingEntry`)

Staging Entries are temporary records created from external data sources (e.g., CSV files from PSPs, bank statements) before they are processed by the Recon Engine to become actual ledger Entries and Transactions.

## Prisma Schema (`prisma/schema.prisma`)

```prisma
enum StagingEntryStatus {
  PENDING // Default for new entries, awaiting processing
  PROCESSING // Picked up by the recon engine consumer
  PROCESSED // Successfully processed into a Transaction or matched
  NEEDS_MANUAL_REVIEW // Requires manual intervention (e.g., no match, mismatch, error during processing)
  ARCHIVED // Processed and older than retention period, or explicitly archived
}

enum StagingEntryProcessingMode {
  CONFIRMATION // Default: Entry should attempt to match/fulfill an existing EXPECTED transaction/entry.
  TRANSACTION  // Entry should bypass matching and directly create a new transaction and its corresponding expected leg.
}

model StagingEntry {
  staging_entry_id String                   @id @default(cuid())
  account_id       String // References Account.account_id (but not a formal FK to allow flexibility)
  merchant_id      String // References Merchant.merchant_id (derived via account, for easier querying)
  
  entry_type       EntryType // DEBIT or CREDIT
  amount           Decimal   @db.Decimal(18, 2)
  currency         String    @db.Char(3) // ISO 4217 currency code
  effective_date   DateTime  @db.Timestamp(3)
  
  status           StagingEntryStatus @default(PENDING)
  processing_mode  StagingEntryProcessingMode @default(CONFIRMATION) // New field for processing behavior

  raw_data         Json?     // Original data from the source if needed for audit or reprocessing
  metadata         Json?     // Additional context: order_id, payment_ref, error messages, match details, created_transaction_id etc.
  
  created_at       DateTime  @default(now()) @db.Timestamp(3)
  updated_at       DateTime  @updatedAt @db.Timestamp(3)
  processed_at     DateTime? @db.Timestamp(3) // When status became PROCESSED
  discarded_at     DateTime? @db.Timestamp(3) // When status became ARCHIVED or PROCESSED (if configured to discard)

  // Link to ProcessTracker for asynchronous processing by Recon Engine
  process_tracker_tasks ProcessTracker[]

  @@index([merchant_id, status, created_at])
  @@index([account_id, status, effective_date])
  @@index([status, processing_mode, created_at]) // Index to help consumer pick up PENDING entries by mode
}
```

## Key Attributes & Logic

-   **`staging_entry_id`**: Unique identifier.
-   **`account_id`**: The account this staging entry pertains to.
-   **`merchant_id`**: The merchant associated with this staging entry (denormalized via the account for easier querying and task distribution).
-   **`entry_type`**: `DEBIT` or `CREDIT`.
-   **`amount`**, **`currency`**: Financial details.
-   **`effective_date`**: The date the entry is considered to have occurred.
-   **`status`**:
    -   `PENDING`: Default. Awaiting processing by the Recon Engine consumer.
    -   `PROCESSING`: Picked up by the consumer.
    -   `PROCESSED`: Successfully turned into a transaction or fulfilled an expectation. `discarded_at` is typically set.
    -   `NEEDS_MANUAL_REVIEW`: Could not be processed automatically (no match, data error, etc.). `discarded_at` is NOT set.
    -   `ARCHIVED`: Successfully processed and past retention, or manually archived. `discarded_at` is set.
-   **`processing_mode`**:
    -   `CONFIRMATION` (default): The Recon Engine will attempt to find a matching `EXPECTED` entry/transaction based on rules and `order_id`. If a valid match is found, it fulfills the expectation. If no match or an invalid match, it's typically set to `NEEDS_MANUAL_REVIEW`.
    -   `TRANSACTION`: The Recon Engine will bypass the matching logic and directly attempt to create a new two-legged transaction: one `POSTED` entry based on the staging entry, and one corresponding `EXPECTED` entry based on reconciliation rules.
-   **`raw_data`**: Stores the original input data (e.g., a row from a CSV) for auditing.
-   **`metadata`**: Flexible JSON field for:
    -   `order_id`, `payment_ref` (from source data, used for matching).
    -   `error`, `error_type` (if processing fails).
    -   `matched_transaction_id`, `matched_entry_id`, `evolved_transaction_id` (if successfully matched/fulfilled in `CONFIRMATION` mode).
    -   `created_transaction_id` (if a new transaction was generated in `TRANSACTION` mode).
    -   `match_type` (e.g., `Phase2_Fulfilled`, `NewTransactionGenerated`).
    -   `source_staging_entry_id` (copied to created Transaction and Entry metadata).
-   **`processed_at`**: Timestamp when the entry was successfully processed.
-   **`discarded_at`**: Timestamp when the entry was archived or considered "done" (e.g., after successful processing if configured). Not set for `NEEDS_MANUAL_REVIEW`.

## API Endpoints

-   **`POST /api/accounts/:account_id/staging-entries`**: Create a single `StagingEntry`.
    -   Requires `processing_mode` in the request body.
-   **`POST /api/accounts/:account_id/staging-entries/files`**: Upload a CSV file to create multiple `StagingEntry` records.
    -   Requires `processing_mode` as a form field in the multipart request.
-   **`GET /api/staging-entries?status=<status>&merchantId=<id>`**: List staging entries with filtering.
-   **`GET /api/staging-entries/:staging_entry_id`**: Get a specific staging entry.
-   **`PATCH /api/staging-entries/:staging_entry_id/review`**: (Conceptual) Endpoint for manually reviewing/reprocessing an entry in `NEEDS_MANUAL_REVIEW`.

## Core Logic (`src/server/core/staging-entry/index.js`)

-   **`createStagingEntry(data)`**:
    -   Validates input.
    -   Creates a `StagingEntry` record with status `PENDING` and the provided `processing_mode`.
    -   Enqueues a `PROCESS_STAGING_ENTRY` task in `ProcessTracker`.
-   **`ingestStagingEntriesFromFile(file, accountId, merchantId, processingMode)`**:
    -   Parses CSV file.
    -   **CSV `type` field handling**:
        -   Validates the `type` field in the CSV. Accepted values (case-insensitive) now include: 'Payment', 'Refund', 'DEBIT', 'CREDIT'. ('Chargeback' is no longer directly processed from this field in the ingestion logic).
        -   If `type` is 'DEBIT' or 'CREDIT', this is used directly as the `EntryType`.
        -   Otherwise, for 'Payment' or 'Refund', the `EntryType` is determined based on the `account.account_type` (e.g., a 'Payment' for a `DEBIT_NORMAL` account becomes a `DEBIT` entry).
    -   For each valid row, calls `createStagingEntry` with the processed data and the provided `processingMode`.

## Interaction with Recon Engine

-   When a `StagingEntry` is created, a task is added to `ProcessTracker`.
-   The Recon Engine consumer (`src/server/core/recon-engine/consumer.js`) picks up `PENDING` tasks.
-   `processStagingEntryWithRecon(stagingEntry, merchantId)` in `src/server/core/recon-engine/engine.js` is called.
-   The engine's behavior branches based on `stagingEntry.processing_mode`:
    -   **`CONFIRMATION`**: Attempts to match against existing `EXPECTED` entries.
    -   **`TRANSACTION`**: Calls `generateTransactionEntriesFromStaging` to derive data for a new transaction and its expected leg, then calls `transactionCore.createTransactionInternal`.
-   The `StagingEntry` status is updated to `PROCESSED` (and `discarded_at` set) or `NEEDS_MANUAL_REVIEW` based on the outcome. Metadata is updated with details of the processing (e.g., error, matched IDs, created transaction ID).

## User Stories

-   As a Finance User, I want to upload a CSV of bank transactions so they can be automatically reconciled or flagged for review.
-   As a System Administrator, I want `StagingEntry` records to clearly indicate their processing mode (`CONFIRMATION` or `TRANSACTION`) to understand how they will be handled by the recon engine.
-   As a Finance User, when a staging entry is in `TRANSACTION` mode, I expect the system to create a new transaction and its corresponding expectation without attempting to match existing data.
-   As a Finance User, when a staging entry is in `CONFIRMATION` mode, I expect the system to attempt to match it against existing expected entries.
