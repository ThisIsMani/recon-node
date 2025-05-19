# Plan: Implement Entries API (GET) - 2025-05-19

**Objective:** Define the `Entry` model and `EntryStatus` enum in Prisma, create a GET API endpoint to list entries for an account, and implement associated tests and documentation. Entries will not have a direct creation API.

## Steps

| Done | #  | Action                                      | Detail                                                                 |
|------|----|---------------------------------------------|------------------------------------------------------------------------|
| [ ]  | 1  | Update Prisma Schema (`prisma/schema.prisma`) | Add `EntryStatus` enum, `Entry` model, and relation to `Account`.      |
| [ ]  | 2  | Run Prisma Migration                        | `npx prisma migrate dev --name add_entries_table`                      |
| [ ]  | 3  | Create Core Logic Directory                 | `src/server/core/entry/`                                               |
| [ ]  | 4  | Create API Routes Directory                 | `src/server/routes/entry/`                                             |
| [ ]  | 5  | Implement Core Logic for Listing Entries    | `src/server/core/entry/index.js` - `listEntries` function.             |
| [ ]  | 6  | Implement API Route for Listing Entries     | `src/server/routes/entry/index.js` - GET `/` endpoint.                 |
| [ ]  | 7  | Mount Entry Routes in Main Router           | `src/server/routes/index.js`                                           |
| [ ]  | 8  | Update Swagger Definition                   | `src/config/swaggerDef.js` - Add `Entry`, `EntryStatusEnum` schemas.   |
| [ ]  | 9  | Create Memory Bank Entity File              | `memory-bank/entities/entries.md`                                      |
| [ ]  | 10 | Create Test Directory                       | `tests/entry/`                                                         |
| [ ]  | 11 | Implement API Tests for Listing Entries     | `tests/entry/entry.js`                                                 |
| [ ]  | 12 | Update Memory Bank: `activeContext.md`      | Reflect current focus on Entries API.                                  |
| [ ]  | 13 | Update Memory Bank: `progress.md`           | Log commencement of Entries API task.                                  |

<!--
{
  "planName": "Implement Entries API (GET)",
  "date": "2025-05-19",
  "plan": [
    {
      "id": 1,
      "action": "Update Prisma Schema",
      "tool": "replace_in_file",
      "args": {
        "path": "prisma/schema.prisma",
        "diff": [
          {
            "search": "// Future: Define other models for the Smart Ledger here\n// model Entry { ... }\n// model Transaction { ... }",
            "replace": "enum EntryStatus {\n  EXPECTED\n  POSTED\n  ARCHIVED\n}\n\nmodel Entry {\n  entry_id         String      @id @default(cuid())\n  account_id       String\n  transaction_id   String?     // Foreign Key to a future Transaction model\n  entry_type       EntryType\n  amount           Decimal\n  currency         String\n  status           EntryStatus\n  effective_date   DateTime    // Renamed from entry_date for consistency\n  metadata         Json?       @db.JsonB\n  discarded_at     DateTime?   // Should be set when status is ARCHIVED\n  created_at       DateTime    @default(now())\n  updated_at       DateTime    @updatedAt\n\n  account          Account     @relation(fields: [account_id], references: [account_id])\n  // transaction   Transaction? @relation(fields: [transaction_id], references: [transaction_id]) // Future relation\n\n  @@index([account_id])\n  @@index([transaction_id])\n  @@index([status])\n  @@index([effective_date])\n}\n\n// Future: Define other models for the Smart Ledger here\n// model Transaction { ... }"
          },
          {
            "search": "  stagingEntries  StagingEntry[]\n\n  @@index([merchant_id])\n}",
            "replace": "  stagingEntries  StagingEntry[]\n  entries         Entry[]     // Relation to Entry model\n\n  @@index([merchant_id])\n}"
          }
        ]
      },
      "success_criteria": "prisma/schema.prisma file is updated with EntryStatus enum, Entry model, and Account relation.",
      "status": "pending"
    },
    {
      "id": 2,
      "action": "Run Prisma Migration",
      "tool": "execute_command",
      "args": {
        "command": "npx prisma migrate dev --name add_entries_table",
        "requires_approval": true
      },
      "success_criteria": "Prisma migration 'add_entries_table' completes successfully.",
      "status": "pending"
    },
    {
      "id": 3,
      "action": "Create Core Logic Directory",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/core/entry/.gitkeep",
        "content": ""
      },
      "success_criteria": "Directory src/server/core/entry/ is created.",
      "status": "pending"
    },
    {
      "id": 4,
      "action": "Create API Routes Directory",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/routes/entry/.gitkeep",
        "content": ""
      },
      "success_criteria": "Directory src/server/routes/entry/ is created.",
      "status": "pending"
    },
    {
      "id": 5,
      "action": "Implement Core Logic for Listing Entries",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/core/entry/index.js",
        "content": "const prisma = require('../../../services/prisma');\n\n/**\n * Lists entries for a specific account, with optional filtering.\n * @param {string} accountId - The ID of the account.\n * @param {object} queryParams - Query parameters for filtering (e.g., status).\n * @returns {Promise<Array<Entry>>} A promise that resolves to an array of entries.\n */\nconst listEntries = async (accountId, queryParams) => {\n  const { status } = queryParams;\n  const whereClause = { account_id: accountId };\n\n  if (status) {\n    whereClause.status = status;\n  }\n\n  try {\n    const entries = await prisma.entry.findMany({\n      where: whereClause,\n      include: {\n        account: {\n          select: {\n            account_id: true,\n            account_name: true,\n            merchant_id: true\n          }\n        }\n      },\n      orderBy: {\n        effective_date: 'desc'\n      }\n    });\n    return entries;\n  } catch (error) {\n    // It's good practice to log the error and rethrow or handle it specifically\n    console.error(`Error fetching entries for account ${accountId}:`, error);\n    // Avoid exposing detailed Prisma errors directly to the client in a real app\n    // For now, rethrow to be caught by a general error handler\n    throw new Error('Could not retrieve entries.');\n  }\n};\n\nmodule.exports = {\n  listEntries,\n};"
      },
      "success_criteria": "src/server/core/entry/index.js created with listEntries function.",
      "status": "pending"
    },
    {
      "id": 6,
      "action": "Implement API Route for Listing Entries",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/routes/entry/index.js",
        "content": "const express = require('express');\nconst { listEntries } = require('../../core/entry');\n\n// mergeParams: true is essential for accessing :account_id from the parent router\nconst router = express.Router({ mergeParams: true });\n\n/**\n * @swagger\n * tags:\n *   name: Entries\n *   description: Ledger entry management (currently, only listing is supported).\n */\n\n/**\n * @swagger\n * /accounts/{accountId}/entries:\n *   get:\n *     summary: List entries for a specific account.\n *     tags: [Entries]\n *     description: Retrieves a list of ledger entries associated with the given account ID. Entries are not created directly via API.\n *     parameters:\n *       - in: path\n *         name: accountId\n *         required: true\n *         schema:\n *           type: string\n *         description: The ID of the account to retrieve entries for.\n *       - in: query\n *         name: status\n *         schema:\n *           $ref: '#/components/schemas/EntryStatusEnum'\n *         description: Optional. Filter entries by status.\n *     responses:\n *       200:\n *         description: A list of entries.\n *         content:\n *           application/json:\n *             schema:\n *               type: array\n *               items:\n *                 $ref: '#/components/schemas/Entry'\n *       404:\n *         description: Account not found.\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/ErrorResponse'\n *       500:\n *         description: Internal server error.\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/ErrorResponse'\n */\nrouter.get('/', async (req, res) => {\n  const { account_id } = req.params; // account_id from path due to mergeParams\n  const queryParams = req.query;\n\n  try {\n    // First, check if the account exists to provide a 404 if not\n    // This check might be redundant if listEntries handles it, but good for clarity\n    const account = await prisma.account.findUnique({ where: { account_id } });\n    if (!account) {\n      return res.status(404).json({ error: 'Account not found.' });\n    }\n\n    const entries = await listEntries(account_id, queryParams);\n    res.json(entries);\n  } catch (error) {\n    console.error(`Failed to list entries for account ${account_id}:`, error);\n    // Avoid sending detailed error messages to the client in production\n    res.status(500).json({ error: 'Failed to retrieve entries.' });\n  }\n});\n\nmodule.exports = router;"
      },
      "success_criteria": "src/server/routes/entry/index.js created with GET / route and Swagger JSDoc.",
      "status": "pending"
    },
    {
      "id": 7,
      "action": "Mount Entry Routes in Main Router",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/routes/index.js",
        "diff": [
          {
            "search": "const stagingEntryRoutes = require('./staging-entry');",
            "replace": "const stagingEntryRoutes = require('./staging-entry');\nconst entryRoutes = require('./entry'); // Import entry routes"
          },
          {
            "search": "// Mount staging entries routes (nested under accounts)\nrouter.use('/accounts/:account_id/staging-entries', stagingEntryRoutes);",
            "replace": "// Mount staging entries routes (nested under accounts)\nrouter.use('/accounts/:account_id/staging-entries', stagingEntryRoutes);\n\n// Mount entry routes (nested under accounts)\nrouter.use('/accounts/:account_id/entries', entryRoutes);"
          }
        ]
      },
      "success_criteria": "src/server/routes/index.js updated to import and use entryRoutes.",
      "status": "pending"
    },
    {
      "id": 8,
      "action": "Update Swagger Definition",
      "tool": "replace_in_file",
      "args": {
        "path": "src/config/swaggerDef.js",
        "diff": [
          {
            "search": "        StagingEntryStatusEnum: {",
            "replace": "        EntryStatusEnum: {\n          type: 'string',\n          enum: ['EXPECTED', 'POSTED', 'ARCHIVED'],\n          description: 'Status of a ledger entry.',\n          example: 'POSTED'\n        },\n        Entry: {\n          type: 'object',\n          properties: {\n            entry_id: { type: 'string', description: 'Unique ID of the ledger entry.', example: 'clxmgmefg000208l3h4j5k6l7' },\n            account_id: { type: 'string', description: 'Associated account ID.' },\n            transaction_id: { type: 'string', nullable: true, description: 'Associated transaction ID (if any).' },\n            entry_type: { $ref: '#/components/schemas/EntryTypeEnum' },\n            amount: { type: 'number', format: 'decimal', description: 'Monetary amount.' },\n            currency: { type: 'string', description: '3-letter currency code.' },\n            status: { $ref: '#/components/schemas/EntryStatusEnum' },\n            effective_date: { type: 'string', format: 'date-time', description: 'Effective date of the entry.' },\n            metadata: { type: 'object', nullable: true, description: 'Optional JSON metadata.' },\n            discarded_at: { type: 'string', format: 'date-time', nullable: true, description: 'Timestamp if entry is archived and effectively discarded.' },\n            created_at: { type: 'string', format: 'date-time' },\n            updated_at: { type: 'string', format: 'date-time' }\n          }\n        },\n        StagingEntryStatusEnum: {"
          }
        ]
      },
      "success_criteria": "src/config/swaggerDef.js updated with Entry and EntryStatusEnum schemas.",
      "status": "pending"
    },
    {
      "id": 9,
      "action": "Create Memory Bank Entity File",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/entities/entries.md",
        "content": "# Entity: Entries\n\n**Overview:**\nEntries represent final, posted financial movements within the Smart Ledger system. They are the core records that affect account balances and reflect confirmed transactions. Unlike Staging Entries, Entries are not typically created directly via an API but are the result of processing other data (e.g., Staging Entries, system-generated events).\n\n**Prisma Schema Definition (`Entry` model from `prisma/schema.prisma`):**\n```prisma\nenum EntryStatus {\n  EXPECTED  // Anticipated movement, possibly generated by a rule or system logic.\n  POSTED    // Confirmed, final entry impacting the ledger's posted_balance.\n  ARCHIVED  // Superseded, corrected, or otherwise no longer active; discarded_at should be set.\n}\n\nmodel Entry {\n  entry_id         String      @id @default(cuid())\n  account_id       String\n  transaction_id   String?     // Foreign Key to a future Transaction model\n  entry_type       EntryType   // Reuses existing DEBIT/CREDIT enum\n  amount           Decimal\n  currency         String\n  status           EntryStatus\n  effective_date   DateTime\n  metadata         Json?       @db.JsonB\n  discarded_at     DateTime?   // Set when status is ARCHIVED\n  created_at       DateTime    @default(now())\n  updated_at       DateTime    @updatedAt\n\n  account          Account     @relation(fields: [account_id], references: [account_id])\n  // transaction   Transaction? @relation(fields: [transaction_id], references: [transaction_id]) // Future: Link to Transaction model\n}\n```\n\n**API Endpoints:**\n- `GET /api/accounts/:account_id/entries`: List entries for the specified account. Supports filtering by `status` (e.g., `EXPECTED`, `POSTED`, `ARCHIVED`) via query parameters.\n  - **Note:** There is no `POST` endpoint for creating entries directly via the API. Entries are created through internal system processes.\n\n**Core Logic (`src/server/core/entry/index.js`):\n- `listEntries(account_id, queryParams)`: Retrieves entries for a given account, allowing filtering by status. Includes related account details.\n\n**Lifecycle & Purpose:**\n- `EXPECTED`: An entry that is anticipated but not yet confirmed. This might be generated by the recon engine based on rules.\n- `POSTED`: A confirmed financial movement that has impacted an account's balance. This is the primary active state for ledger entries.\n- `ARCHIVED`: An entry that is no longer active, typically because it has been corrected, superseded, or is part of a voided transaction. The `discarded_at` field should be populated for these entries.\n\n**Future Considerations:**\n- The `Transaction` model will group related entries.\n- Logic for calculating account balances will primarily use `POSTED` entries.\n- Internal processes will be responsible for creating `Entry` records, potentially transitioning `StagingEntry` records to `Entry` records or generating `EXPECTED` entries based on system rules."
      },
      "success_criteria": "memory-bank/entities/entries.md created with documentation for the Entry entity.",
      "status": "pending"
    },
    {
      "id": 10,
      "action": "Create Test Directory",
      "tool": "write_to_file",
      "args": {
        "path": "tests/entry/.gitkeep",
        "content": ""
      },
      "success_criteria": "Directory tests/entry/ is created.",
      "status": "pending"
    },
    {
      "id": 11,
      "action": "Implement API Tests for Listing Entries",
      "tool": "write_to_file",
      "args": {
        "path": "tests/entry/entry.js",
        "content": "const request = require('supertest');\nconst { app, server } = require('../../src/app'); // Assuming app is exported for testing\nconst prisma = require('../../src/services/prisma');\n\ndescribe('Entry API - GET /api/accounts/:account_id/entries', () => {\n  let testMerchant;\n  let testAccount;\n  // Sample entries to be created for testing\n  const entryData = [\n    {\n      entry_type: 'CREDIT',\n      amount: 100.50,\n      currency: 'USD',\n      status: 'POSTED',\n      effective_date: new Date().toISOString(),\n    },\n    {\n      entry_type: 'DEBIT',\n      amount: 50.25,\n      currency: 'USD',\n      status: 'EXPECTED',\n      effective_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // Yesterday\n    },\n    {\n      entry_type: 'CREDIT',\n      amount: 200.00,\n      currency: 'USD',\n      status: 'POSTED',\n      effective_date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), // Day before yesterday\n    },\n    {\n      entry_type: 'DEBIT',\n      amount: 75.00,\n      currency: 'USD',\n      status: 'ARCHIVED',\n      effective_date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),\n      discarded_at: new Date().toISOString(),\n    },\n  ];\n\n  beforeAll(async () => {\n    // 1. Create a merchant for context\n    testMerchant = await prisma.merchantAccount.create({\n      data: {\n        merchant_id: `test_merchant_entries_${Date.now()}`,\n        merchant_name: 'Test Merchant for Entries',\n      },\n    });\n\n    // 2. Create an account for this merchant\n    testAccount = await prisma.account.create({\n      data: {\n        merchant_id: testMerchant.merchant_id,\n        account_name: 'Test Account for Entries',\n        account_type: 'DEBIT_NORMAL',\n        currency: 'USD',\n      },\n    });\n\n    // 3. Create some entries directly in the DB for this account (since no POST API)\n    for (const data of entryData) {\n      await prisma.entry.create({\n        data: {\n          ...data,\n          account_id: testAccount.account_id,\n        },\n      });\n    }\n  });\n\n  afterAll(async () => {\n    // Clean up: delete entries, account, and merchant\n    // Order matters due to foreign key constraints if cascading deletes aren't set up for all relations\n    await prisma.entry.deleteMany({ where: { account_id: testAccount.account_id } });\n    await prisma.account.delete({ where: { account_id: testAccount.account_id } });\n    await prisma.merchantAccount.delete({ where: { merchant_id: testMerchant.merchant_id } });\n    await prisma.$disconnect();\n    server.close(); // Close the server after tests\n  });\n\n  it('should list all entries for a valid account ID', async () => {\n    const response = await request(app).get(`/api/accounts/${testAccount.account_id}/entries`);\n    expect(response.statusCode).toBe(200);\n    expect(response.body).toBeInstanceOf(Array);\n    expect(response.body.length).toBe(entryData.length);\n    // Check if some key properties are present\n    response.body.forEach(entry => {\n      expect(entry).toHaveProperty('entry_id');\n      expect(entry).toHaveProperty('account_id', testAccount.account_id);\n      expect(entry).toHaveProperty('amount');\n      expect(entry).toHaveProperty('status');\n      expect(entry).toHaveProperty('account'); // Check for included account details\n      expect(entry.account).toHaveProperty('account_name', testAccount.account_name);\n    });\n  });\n\n  it('should filter entries by status=POSTED', async () => {\n    const response = await request(app).get(`/api/accounts/${testAccount.account_id}/entries?status=POSTED`);\n    expect(response.statusCode).toBe(200);\n    expect(response.body).toBeInstanceOf(Array);\n    const postedEntriesCount = entryData.filter(e => e.status === 'POSTED').length;\n    expect(response.body.length).toBe(postedEntriesCount);\n    response.body.forEach(entry => {\n      expect(entry.status).toBe('POSTED');\n    });\n  });\n\n  it('should filter entries by status=EXPECTED', async () => {\n    const response = await request(app).get(`/api/accounts/${testAccount.account_id}/entries?status=EXPECTED`);\n    expect(response.statusCode).toBe(200);\n    expect(response.body).toBeInstanceOf(Array);\n    const expectedEntriesCount = entryData.filter(e => e.status === 'EXPECTED').length;\n    expect(response.body.length).toBe(expectedEntriesCount);\n    response.body.forEach(entry => {\n      expect(entry.status).toBe('EXPECTED');\n    });\n  });\n\n  it('should return an empty array if no entries match filter', async () => {\n    // Assuming no 'PENDING' status exists for EntryStatus enum\n    const response = await request(app).get(`/api/accounts/${testAccount.account_id}/entries?status=PENDING_REVIEW`);\n    expect(response.statusCode).toBe(200); // Still 200, but empty array\n    expect(response.body).toBeInstanceOf(Array);\n    expect(response.body.length).toBe(0);\n  });\n\n  it('should return 404 if the account ID does not exist', async () => {\n    const nonExistentAccountId = 'non-existent-account-id-123';\n    const response = await request(app).get(`/api/accounts/${nonExistentAccountId}/entries`);\n    expect(response.statusCode).toBe(404);\n    expect(response.body).toHaveProperty('error', 'Account not found.');\n  });\n\n  it('should return entries ordered by effective_date descending', async () => {\n    const response = await request(app).get(`/api/accounts/${testAccount.account_id}/entries`);\n    expect(response.statusCode).toBe(200);\n    expect(response.body.length).toBeGreaterThan(1);\n    // Check if dates are in descending order\n    for (let i = 0; i < response.body.length - 1; i++) {\n      const date1 = new Date(response.body[i].effective_date);\n      const date2 = new Date(response.body[i+1].effective_date);\n      expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());\n    }\n  });\n});"
      },
      "success_criteria": "tests/entry/entry.js created with API tests for the GET /entries endpoint.",
      "status": "pending"
    },
    {
      "id": 12,
      "action": "Update Memory Bank: activeContext.md",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/activeContext.md",
        "content": "# Active Context: Smart Ledger Backend (Node.js) - Entries API\n\n**Current Focus:**\n- Implementation of the \"Entries\" API, specifically the GET endpoint for listing entries associated with an account.\n- Defining the `Entry` model and `EntryStatus` enum in Prisma.\n\n**Key Decisions & Design Points for Entries API:**\n- **Database (`prisma/schema.prisma`):**\n  - New `EntryStatus` enum: `EXPECTED`, `POSTED`, `ARCHIVED`.\n  - New `Entry` model: `entry_id`, `account_id`, `transaction_id?`, `entry_type`, `amount`, `currency`, `status`, `effective_date`, `metadata?`, `discarded_at?`, `created_at`, `updated_at`.\n  - `Account` model updated with `entries Entry[]` relation.\n- **API Endpoints:**\n  - `GET /api/accounts/:account_id/entries`: Lists entries for a specific account. Supports filtering by `status`.\n  - **No direct creation API (`POST`) for Entries.** They are intended to be created by internal system processes.\n- **Core Logic (`src/server/core/entry/index.js`):\n  - `listEntries(account_id, queryParams)`: Fetches entries, includes related account details, orders by `effective_date` descending.\n- **Routing:** New entry router mounted at `/api/accounts/:account_id/entries` with `mergeParams: true`.\n- **Documentation:**\n  - Swagger API documentation (`src/config/swaggerDef.js` and JSDoc in routes) to be updated.\n  - New Memory Bank entity file `memory-bank/entities/entries.md` to be created.\n- **Testing:** API tests for the GET endpoint to be implemented in `tests/entry/entry.js`.\n\n**Next Steps (High-Level, during this task):**\n1.  Execute the plan for Entries API (schema, migration, core logic, routes, docs, tests).\n2.  Ensure all tests pass.\n3.  Commit changes with a descriptive message (e.g., \"feat: Implement Entries API (GET) and model\").\n\n**Future Considerations (Post-Entries API):**\n- Define and implement the `Transaction` model and its relationship with `Entry`.\n- Develop internal mechanisms for creating `Entry` records (e.g., processing `StagingEntry` items, recon engine creating `EXPECTED` entries).\n- Implement logic for on-the-fly balance calculations on `Account` based on `POSTED` entries.\n- Address TODOs from previous phases (e.g., robust input validation, balance check on account deletion)."
      },
      "success_criteria": "memory-bank/activeContext.md updated to reflect current focus on Entries API.",
      "status": "pending"
    },
    {
      "id": 13,
      "action": "Update Memory Bank: progress.md",
      "tool": "replace_in_file",
      "args": {
        "path": "memory-bank/progress.md",
        "diff": [
          {
            "search": "---",
            "replace": "---\n\n**2025-05-19 (Entries API Implementation - Phase 1: GET Endpoint):**\n\n- **Task:** Define the `Entry` model and `EntryStatus` enum. Implement the GET API endpoint (`/api/accounts/:account_id/entries`) for listing entries, along with associated core logic, documentation, and tests. Entries will not have a direct creation API in this phase.\n- **Status:** In Progress.\n\n---"
          }
        ]
      },
      "success_criteria": "memory-bank/progress.md updated with a new entry for the Entries API task.",
      "status": "pending"
    }
  ]
}
-->
