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

**Core Logic (`src/server/core/staging-entry/index.js`):**
- `createStagingEntry(account_id, entryData)`: Creates a new entry for the given account_id.
- `listStagingEntries(account_id, queryParams)`: Lists entries for the given account_id, allowing for filtering. Includes related account details.

**Lifecycle & Purpose:**
- Staging entries serve as an initial capture point for financial data that may require validation or manual intervention.
- `NEEDS_MANUAL_REVIEW`: Default state, or set if automated processing encounters issues.
- `PROCESSED`: Indicates the entry has been handled (e.g., transformed into a final ledger entry, matched, or otherwise actioned). If an entry is effectively discarded as part of processing (e.g. a correction is made elsewhere), `discarded_at` can be set.
- This entity is distinct from the final `Entry` model that will represent posted ledger movements.
