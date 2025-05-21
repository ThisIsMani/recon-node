# Entity: Staging Entries

**Overview:**
Staging Entries represent financial movements that are captured in a temporary holding or pre-processing area. They allow for data ingestion, initial validation, and potential manual review before being transformed into final ledger entries or other processed states.

**Prisma Schema Definition (`StagingEntry` model from `prisma/schema.prisma`):**
```prisma
enum StagingEntryStatus {
  NEEDS_MANUAL_REVIEW
  PROCESSED
}

model StagingEntry {
  staging_entry_id String               @id @default(cuid())
  account_id         String
  entry_type         EntryType
  amount             Decimal
  currency           String
  status             StagingEntryStatus   @default(NEEDS_MANUAL_REVIEW)
  effective_date     DateTime
  metadata           Json?                @db.JsonB
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
  - Request Body: `{ entry_type, amount, currency, effective_date, metadata?, discarded_at? }` (account_id is from path)
- `GET /api/accounts/:account_id/staging-entries`: List staging entries for the specified account. Supports filtering by `status` via query parameters.
- `POST /api/accounts/:account_id/staging-entries/files`: Ingest staging entries from a CSV file for a specific account.
  - Request: `multipart/form-data` with a `file` field (CSV).
  - CSV Columns Expected: `order_id`, `amount`, `currency`, `transaction_date`, `type` ("Payment" or "Refund").
  - Response: Summary of successful and failed ingestions, with details for errors.

**Core Logic (`src/server/core/staging-entry/index.js`):**
- `createStagingEntry(account_id, entryData)`: Creates a new entry for the given account_id. **Upon successful creation, this function also acts as a "producer" by creating a `PROCESS_STAGING_ENTRY` task in the `ProcessTracker` for the Recon Engine to consume.**
- `listStagingEntries(account_id, queryParams)`: Lists entries for the given account_id, allowing for filtering. Includes related account details.
- `ingestStagingEntriesFromFile(accountId, file)`: Parses a CSV file, validates rows, transforms data (including determining DEBIT/CREDIT based on account type and CSV "type" field), and calls `createStagingEntry` for each valid row. Returns a summary of successes and failures.

**Lifecycle & Purpose:**
- Staging entries serve as an initial capture point for financial data that may require validation or manual intervention.
- `NEEDS_MANUAL_REVIEW`: Default state. Also set if automated processing by the Recon Engine encounters issues (e.g., no matching `EXPECTED` entry found, ambiguous match, data validation failure during matching, or errors like `NoReconRuleFoundError` if a new transaction creation were attempted and failed). When an entry is moved to this state due to a processing issue, `discarded_at` is **NOT** set, as the entry still requires attention.
- `PROCESSED`: Indicates the entry has been successfully handled by the Recon Engine (e.g., an existing expectation was fulfilled and an evolved transaction was created). When an entry is successfully processed, its `discarded_at` field **IS** set to the current timestamp, signifying it has been fully actioned.
- This entity is distinct from the final `Entry` model that will represent posted ledger movements.
