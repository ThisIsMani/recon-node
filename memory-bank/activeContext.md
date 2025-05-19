# Active Context: Smart Ledger Backend (Node.js) (as of 2025-05-19)

**Current Focus:**
- Initial project setup for a Node.js backend with Prisma ORM.
- Establishing PostgreSQL database connectivity via Prisma.
- Creating `/api/health` and `/api/merchants` (POST, GET) endpoints.
- Setting up Swagger for API documentation.
- Documenting the setup and architecture in `README.md` and Memory Bank.

**Key Decisions Made (during this session):**
- Switched technology stack from Python/Flask/Gemini to Node.js/Express/PostgreSQL (pure backend).
- Integrated Prisma for ORM and database migrations.
- Implemented API documentation using Swagger UI and JSDoc.
- Adopted a specific project folder structure:
  ```
  src/
  ├── app.js, server.js
  ├── config/ (index.js)
  ├── services/ (database.js)
  ├── db_models/
  ├── api_models/
  ├── server/
  │   ├── routes/ (index.js, health.js)
  │   └── core/ (health.js)
  └── utils/
  ```
- File naming convention: Simpler names like `health.js` instead of `health.routes.js`.
- Database connection details to be managed via `.env` file.
- Initial Memory Bank for Node.js project created in `./memory-bank/` (relative path).

**Next Steps (Immediate):**
1. Complete the creation of standard Memory Bank files for Node.js project (`progress.md`) (Done).
2. Guide the user on setting up their `.env` file with PostgreSQL credentials (Done).
3. Test running the Node.js server and the `/api/health` endpoint (Done - Server running and DB connected).
4. Implement initial Merchant API (`/api/merchants` POST & GET) with Prisma (Done).
5. Set up Swagger API documentation (Done).
6. Test Merchant API and Swagger UI (Done).
7. Update `README.md` and Memory Bank documents with Prisma and Merchant API details (This step).
8. Discuss and plan the database schema (tables for Smart Ledger Accounts, Entries, Transactions, Rules) using Prisma schema.
9. Begin implementation of further core Smart Ledger API endpoints.

**Open Questions/Considerations:**
- User needs to provide PostgreSQL connection details for their `.env` file (Done).
- User needs to ensure the target database (specified in `DB_NAME`) exists in their PostgreSQL instance (User confirmed `recon_node` created).
- Future considerations: more robust input validation, advanced error handling, logging, authentication, testing for new endpoints.
