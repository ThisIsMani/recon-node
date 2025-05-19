# Entity: Transactions

**Overview:**
Transactions group one or more related `Entry` records that constitute a single, logical financial event or a distinct stage of an event. They support versioning for corrections.

**Prisma Schema Definition (`Transaction` model from `prisma/schema.prisma`):**
```prisma
enum TransactionStatus {
  EXPECTED
  POSTED
  MISMATCH
  ARCHIVED
}

model Transaction {
  transaction_id         String            @id @default(cuid())
  logical_transaction_id String            @default(cuid())
  version                Int               @default(1)
  merchant_id            String            @db.VarChar(255)
  status                 TransactionStatus
  created_at             DateTime          @default(now())
  updated_at             DateTime          @updatedAt
  discarded_at           DateTime?
  metadata               Json?             @db.JsonB

  merchant               MerchantAccount   @relation(fields: [merchant_id], references: [merchant_id])
  entries                Entry[]           // Relation to multiple entries

  @@index([logical_transaction_id])
  @@index([merchant_id])
  @@index([status])
  @@unique([logical_transaction_id, version])
}
```

**API Endpoints:**
- `GET /api/merchants/:merchant_id/transactions`: List transactions for the specified merchant. Supports filtering by `status`, `logical_transaction_id`, and `version` via query parameters.
  - **Note:** There is no `POST` endpoint for creating transactions directly via the API. Transactions are created through internal system processes.

**Core Logic (`src/server/core/transaction/index.js`):**
- `listTransactions(merchant_id, queryParams)`: Retrieves transactions for a given merchant, allowing filtering. Includes related entries.

**Lifecycle & Purpose:**
- `EXPECTED`: Contains at least one `expected` entry and no `pending_confirmation` or `mismatched` entries. Awaiting actuals.
- `POSTED`: All constituent entries are `posted`, and the transaction is balanced (total debits = total credits).
- `MISMATCH`: Discrepancies found during processing that require intervention.
- `ARCHIVED`: This version of the transaction has been superseded by a newer version due to correction. `discarded_at` should be set.

**Versioning for Corrections:**
If a `POSTED` transaction needs correction, its status becomes `ARCHIVED`. A new transaction is created with the same `logical_transaction_id` and an incremented `version`, containing the corrected set of entries.

**Future Considerations:**
- A join table (`TransactionEntry`) will be introduced to manage the many-to-many relationship between `Transaction` and `Entry` if a single entry could belong to multiple transactions (though current model implies Entry has one Transaction via `transaction_id`). For now, `Entry.transaction_id` provides a one-to-many from Transaction to Entry.
- Internal processes will be responsible for creating `Transaction` records and linking `Entry` records to them.
