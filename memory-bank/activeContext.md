# Active Context: Smart Ledger Backend (Node.js) (as of 2025-05-19)

**Current Focus:**
- Completion of API Testing Setup and initial test suites for Merchants and Accounts.
- Planning for next phase: Entries and Transactions.

**Key Decisions & Outcomes (API Testing Setup):**
- Testing Framework: Jest with Supertest for API endpoint testing.
- Test Directory: `tests/` with subdirectories `merchants/` and `accounts/`. Test files: `merchants.js`, `accounts.js`.
- Test Database: Dedicated `recon_node_test` database.
- Environment Config: `.env.test` for test `DATABASE_URL`, loaded via `dotenv` in `jest.setup.js`.
- Database Reset: `npx prisma migrate reset --force --skip-seed` executed via `jest.globalSetup.js` before test runs.
- `package.json`: `test` script configured as `cross-env NODE_ENV=test jest --detectOpenHandles`.
- Jest Configuration: `jest.config.js` created to manage test environment, setup files, test matching patterns, and coverage.
- Initial test suites for Merchant and Account APIs implemented and passing.
- `README.md` updated with testing instructions.
- Plan file `./memory-bank/plans/2025-05-19-api-tests.md` was followed.

**Next Steps (High-Level):**
1.  Update `memory-bank/progress.md` to log the completion of the API testing setup.
2.  Discuss and plan the database schema and APIs for "Entries" and "Transactions".
    *   Define `Entry` model (linking to `Account`, amount, type (debit/credit), transaction_id, etc.).
    *   Define `Transaction` model (grouping entries, date, description, status, etc.).
3.  Implement API endpoints for creating and managing entries and transactions.
4.  Implement logic for on-the-fly balance calculations based on entries.
5.  Write API tests for new Entry and Transaction endpoints.
6.  Address TODOs from previous phases: more robust input validation (e.g., using Joi/Zod), balance check on account deletion.

**Open Questions/Considerations for Next Phase:**
- How should double-entry accounting principles be enforced at the API/core logic level for transactions?
- What are the specific states for a Transaction (e.g., pending, posted, voided)?
- How will idempotency be handled for creating entries/transactions?
- Detailed requirements for balance calculation (e.g., distinguishing between posted and pending entries).
