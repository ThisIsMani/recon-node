# Entity: Staging Entries

**Overview:**
Staging Entries represent financial movements that are captured in a temporary holding or pre-processing area. They allow for data ingestion, initial validation, and potential manual review before being transformed into final ledger entries or other processed states.

**Prisma Schema Definition (`StagingEntry` model from `prisma/schema.prisma`):**
```prisma
enum StagingEntryStatus {
  PENDING 
  NEEDS_MANUAL_REVIEW
  PROCESSED
}

enum StagingEntryProcessingMode {
  CONFIRMATION // Indicates the entry should match an existing expectation
  TRANSACTION  // Indicates the entry should create a new transaction and its expectation
}

model StagingEntry {
  staging_entry_id String                       @id @default(cuid())
  account_id         String
  entry_type         EntryType
  amount             Decimal
  currency           String
  status             StagingEntryStatus           @default(PENDING)
  processing_mode    StagingEntryProcessingMode @default(CONFIRMATION) // New mandatory field with default
  effective_date     DateTime
  metadata           Json?                        @db.JsonB
  discarded_at       DateTime?
  created_at         DateTime             @default(now())
  updated_at         DateTime             @updatedAt

  account            Account              @relation(fields: [account_id], references: [account_id])

  @@index([account_id])
  @@index([status])
  @@index([effective_date])
}

// Shared enum, also used by StagingEntry
enum EntryType {
  DEBIT
  CREDIT
}
```

**API Endpoints:**
- `POST /api/accounts/:account_id/staging-entries`: Create a new staging entry for the specified account.
  - Request Body: `{ entry_type, amount, currency, effective_date, processing_mode, metadata?, discarded_at? }` (`processing_mode` is mandatory).
- `GET /api/accounts/:account_id/staging-entries`: List staging entries for the specified account. Supports filtering by `status` via query parameters.
- `POST /api/accounts/:account_id/staging-entries/files`: Ingest staging entries from a CSV file for a specific account.
  - Request: `multipart/form-data` with a `file` field (CSV) and a `processing_mode` field (mandatory, applies to all entries in the file).
  - CSV Columns Expected: `order_id`, `amount`, `currency`, `transaction_date`, `type` ("Payment" or "Refund").
  - Response: Summary of successful and failed ingestions, with details for errors.

**Core Logic (`src/server/core/staging-entry/index.js`):**
- `createStagingEntry(account_id, entryData)`: Creates a new entry for the given account_id. Requires `processing_mode` in `entryData`. **Upon successful creation, this function also acts as a "producer" by creating a `PROCESS_STAGING_ENTRY` task in the `ProcessTracker` for the Recon Engine to consume.**
- `listStagingEntries(account_id, queryParams)`: Lists entries for the given account_id, allowing for filtering. Includes related account details.
- `ingestStagingEntriesFromFile(accountId, file, processingMode)`: Parses a CSV file, validates rows, transforms data (including determining DEBIT/CREDIT based on account type and CSV "type" field), and calls `createStagingEntry` for each valid row, passing the `processingMode`. Returns a summary of successes and failures.

**Lifecycle & Purpose:**
- Staging entries serve as an initial capture point for financial data that may require validation or manual intervention.
- `processing_mode`: Determines how the Recon Engine will attempt to process the entry:
    - `CONFIRMATION`: The engine will attempt to match this entry against an existing `EXPECTED` entry. If no match, or mismatch, it goes to `NEEDS_MANUAL_REVIEW`.
    - `TRANSACTION`: The engine will attempt to create a new two-legged transaction (one `POSTED`, one `EXPECTED` entry) based on this staging entry and relevant `ReconRule`.
- `PENDING`: The default status for a newly created `StagingEntry`. It indicates that the entry has been ingested but not yet picked up by the Recon Engine for processing. `discarded_at` is **NOT** set.
- `NEEDS_MANUAL_REVIEW`: Set by the Recon Engine if automated processing encounters issues (e.g., no matching `EXPECTED` entry found in `CONFIRMATION` mode, ambiguous match, data validation failure during matching, or errors like `NoReconRuleFoundError` when trying to create a new transaction in `TRANSACTION` mode). When an entry is moved to this state, `discarded_at` is **NOT** set, as the entry still requires attention.
- `PROCESSED`: Indicates the entry has been successfully handled by the Recon Engine (e.g., an existing expectation was fulfilled and an evolved transaction was created, or a new transaction was successfully generated). When an entry is successfully processed, its `discarded_at` field **IS** set to the current timestamp, signifying it has been fully actioned.
- This entity is distinct from the final `Entry` model that will represent posted ledger movements.
