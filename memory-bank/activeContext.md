# Active Context: Smart Ledger Backend (Node.js) - Transactions API

**Current Focus:**
- Implementation of the "Transactions" API, specifically the GET endpoint for listing transactions associated with a merchant.
- Defining the `Transaction` model and `TransactionStatus` enum in Prisma.

**Key Decisions & Design Points for Transactions API:**
- **Database (`prisma/schema.prisma`):**
  - New `TransactionStatus` enum: `EXPECTED`, `POSTED`, `MISMATCH`, `ARCHIVED`.
  - New `Transaction` model: `transaction_id`, `logical_transaction_id`, `version`, `merchant_id`, `status`, `created_at`, `updated_at`, `discarded_at?`, `metadata?`.
  - `Transaction` model has `entries Entry[]` relation.
  - `Entry` model's `transaction_id` field updated to establish FK to `Transaction.transaction_id`.
  - `MerchantAccount` model updated with `transactions Transaction[]` relation.
- **API Endpoints:**
  - `GET /api/merchants/:merchant_id/transactions`: Lists transactions for a specific merchant. Supports filtering by `status`, `logical_transaction_id`, `version`.
  - **No direct creation API (`POST`) for Transactions.** They are intended to be created by internal system processes.
- **Core Logic (`src/server/core/transaction/index.js`):**
  - `listTransactions(merchant_id, queryParams)`: Fetches transactions, includes related entries, orders by `created_at` descending.
- **Routing:** New transaction router mounted at `/api/merchants/:merchant_id/transactions` with `mergeParams: true`.
- **Documentation:**
  - Swagger API documentation (`src/config/swaggerDef.js` and JSDoc in routes) updated.
  - New Memory Bank entity file `memory-bank/entities/transactions.md` created.
- **Testing:** API tests for the GET endpoint implemented in `tests/transaction/transaction.js`.

**Next Steps (High-Level, during this task):**
1.  Execute the plan for Transactions API (schema, migration, core logic, routes, docs, tests). (Currently in progress)
2.  Ensure all tests pass.
3.  Commit changes with a descriptive message (e.g., "feat: Implement Transactions API (GET) and model").

**Future Considerations (Post-Transactions API):**
- Implement the join table for `Transaction` and `Entry` if a many-to-many relationship is needed (current plan is one-to-many from Transaction to Entry).
- Develop internal mechanisms for creating `Transaction` records and linking `Entry` records.
- Implement logic for transaction balancing checks (`total debits = total credits` for `POSTED` status).
