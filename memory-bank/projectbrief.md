# Project Brief: Smart Ledger Backend (Node.js)

**Objective:** Develop a robust backend service for a "Smart Ledger" system to track financial activities, using Node.js, Express.js, and PostgreSQL.

**Core Functionality (as described by user):**
- Manage "Accounts" (categories for money).
- Record "Entries" (credits/debits to accounts).
- Group entries into "Transactions" (representing complete financial events).
- Implement an "expectation-matching" system:
    1. Record an event.
    2. Create an "expectation" for the next step based on pre-set rules.
    3. Match incoming data for the next step against the expectation.

**Initial Technical Scope (as of 2025-05-19):**
- Set up a Node.js project with Express.js.
- Integrated Prisma for ORM and database migrations.
- Established a connection to a PostgreSQL database via Prisma.
- Implemented a `/api/health` endpoint.
- Implemented `/api/merchants` (POST, GET) for merchant account management.
- Set up Swagger for API documentation at `/api-docs`.
- Created a foundational project structure and `README.md`.
- Initialized a new Memory Bank for this Node.js project.

**Future Scope (to be defined and implemented):**
- Define and create the PostgreSQL database schema (via Prisma schema) for Smart Ledger Accounts, Entries, Transactions, and Rules.
- Develop API endpoints for core Smart Ledger operations (e.g., recording sales, processing PSP settlements, bank deposits).
- Implement the business logic for the expectation-matching data flow.
- Add input validation, comprehensive error handling, and logging.
