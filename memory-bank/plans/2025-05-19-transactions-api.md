# Plan: Implement Transactions API (GET) - 2025-05-19

**Objective:** Define the `Transaction` model and `TransactionStatus` enum in Prisma, create a GET API endpoint to list transactions for a merchant account, and implement associated tests and documentation. Transactions will not have a direct creation API.

## User Requirements for Transaction:
*   **Attributes:**
    *   `transaction_id` (String, Primary Key, CUID default)
    *   `logical_transaction_id` (String, CUID default, indexed)
    *   `version` (Integer, default 1)
    *   `merchant_id` (String, FK to `MerchantAccount.merchant_id`) - Added for nesting under merchant
    *   `status` (Enum: `TransactionStatus`)
    *   `created_at` (DateTime, default now)
    *   `updated_at` (DateTime, auto-updated)
    *   `discarded_at` (DateTime, nullable)
    *   `metadata` (JSON, optional)
*   **Transaction Lifecycle Statuses (`TransactionStatus` enum):**
    *   `EXPECTED`
    *   `POSTED`
    *   `MISMATCH`
    *   `ARCHIVED`
*   **API:** List API under merchant account (e.g., `/api/merchants/:merchant_id/transactions`). No direct create API.
*   **Relation:** A transaction will group one or more `Entry` records. This will be handled by a join table in a subsequent task. For now, the `Transaction` model will be standalone but will have a placeholder for `entries Entry[]` relation. The `Entry` model's `transaction_id` will be updated to link to `Transaction.transaction_id`.

## Steps

| Done | #  | Action                                          | Detail                                                                                      |
|------|----|-------------------------------------------------|---------------------------------------------------------------------------------------------|
| [ ]  | 1  | Update Prisma Schema (`prisma/schema.prisma`)     | Add `TransactionStatus` enum, `Transaction` model, and update `Entry` for FK.               |
| [ ]  | 2  | Run Prisma Migration                            | `npx prisma migrate dev --name add_transactions_table`                                      |
| [ ]  | 3  | Create Core Logic Directory                     | `src/server/core/transaction/`                                                              |
| [ ]  | 4  | Create API Routes Directory                     | `src/server/routes/transaction/`                                                            |
| [ ]  | 5  | Implement Core Logic for Listing Transactions   | `src/server/core/transaction/index.js` - `listTransactions` function.                       |
| [ ]  | 6  | Implement API Route for Listing Transactions    | `src/server/routes/transaction/index.js` - GET `/` endpoint.                                |
| [ ]  | 7  | Mount Transaction Routes in Main Router         | `src/server/routes/index.js`                                                                |
| [ ]  | 8  | Update Swagger Definition                       | `src/config/swaggerDef.js` - Add `Transaction`, `TransactionStatusEnum` schemas.            |
| [ ]  | 9  | Create Memory Bank Entity File                  | `memory-bank/entities/transactions.md`                                                      |
| [ ]  | 10 | Create Test Directory                           | `tests/transaction/`                                                                        |
| [ ]  | 11 | Implement API Tests for Listing Transactions    | `tests/transaction/transaction.js`                                                          |
| [ ]  | 12 | Update Memory Bank: `activeContext.md`          | Reflect current focus on Transactions API.                                                  |
| [ ]  | 13 | Update Memory Bank: `progress.md`               | Log commencement of Transactions API task.                                                  |

<!--
{
  "planName": "Implement Transactions API (GET)",
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
            "search": "// Future: Define other models for the Smart Ledger here\n// model Transaction { ... }",
            "replace": "enum TransactionStatus {\n  EXPECTED\n  POSTED\n  MISMATCH\n  ARCHIVED\n}\n\nmodel Transaction {\n  transaction_id         String            @id @default(cuid())\n  logical_transaction_id String            @default(cuid())\n  version                Int               @default(1)\n  merchant_id            String            @db.VarChar(255)\n  status                 TransactionStatus\n  created_at             DateTime          @default(now())\n  updated_at             DateTime          @updatedAt\n  discarded_at           DateTime?         \n  metadata               Json?             @db.JsonB\n\n  merchant               MerchantAccount   @relation(fields: [merchant_id], references: [merchant_id])\n  entries                Entry[]           // Relation to multiple entries\n\n  @@index([logical_transaction_id])\n  @@index([merchant_id])\n  @@index([status])\n  @@unique([logical_transaction_id, version])\n}\n\n// Future: Define other models for the Smart Ledger here"
          },
          {
            "search": "model Entry {\n  entry_id         String      @id @default(cuid())\n  account_id       String\n  transaction_id   String?     // Foreign Key to a future Transaction model",
            "replace": "model Entry {\n  entry_id         String      @id @default(cuid())\n  account_id       String\n  transaction_id   String?     // Foreign Key to Transaction model"
          },
          {
            "search": "  account          Account     @relation(fields: [account_id], references: [account_id])\n  // transaction   Transaction? @relation(fields: [transaction_id], references: [transaction_id]) // Future relation",
            "replace": "  account          Account     @relation(fields: [account_id], references: [account_id])\n  transaction      Transaction? @relation(fields: [transaction_id], references: [transaction_id])"
          },
          {
            "search": "model MerchantAccount {\n  merchant_id   String @id @db.VarChar(255)\n  merchant_name String @db.VarChar(255)\n  accounts      Account[] // Relation to multiple accounts",
            "replace": "model MerchantAccount {\n  merchant_id   String @id @db.VarChar(255)\n  merchant_name String @db.VarChar(255)\n  accounts      Account[]       // Relation to multiple accounts\n  transactions  Transaction[]   // Relation to multiple transactions"
          }
        ]
      },
      "success_criteria": "prisma/schema.prisma file is updated with TransactionStatus enum, Transaction model, and relations.",
      "status": "pending"
    },
    {
      "id": 2,
      "action": "Run Prisma Migration",
      "tool": "execute_command",
      "args": {
        "command": "npx prisma migrate dev --name add_transactions_table",
        "requires_approval": true
      },
      "success_criteria": "Prisma migration 'add_transactions_table' completes successfully.",
      "status": "pending"
    },
    {
      "id": 3,
      "action": "Create Core Logic Directory",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/core/transaction/.gitkeep",
        "content": ""
      },
      "success_criteria": "Directory src/server/core/transaction/ is created.",
      "status": "pending"
    },
    {
      "id": 4,
      "action": "Create API Routes Directory",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/routes/transaction/.gitkeep",
        "content": ""
      },
      "success_criteria": "Directory src/server/routes/transaction/ is created.",
      "status": "pending"
    },
    {
      "id": 5,
      "action": "Implement Core Logic for Listing Transactions",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/core/transaction/index.js",
        "content": "const prisma = require('../../../services/prisma');\n\n/**\n * Lists transactions for a specific merchant, with optional filtering.\n * @param {string} merchantId - The ID of the merchant.\n * @param {object} queryParams - Query parameters for filtering (e.g., status).\n * @returns {Promise<Array<Transaction>>} A promise that resolves to an array of transactions.\n */\nconst listTransactions = async (merchantId, queryParams) => {\n  const { status, logical_transaction_id, version } = queryParams;\n  const whereClause = { merchant_id: merchantId };\n\n  if (status) {\n    whereClause.status = status;\n  }\n  if (logical_transaction_id) {\n    whereClause.logical_transaction_id = logical_transaction_id;\n  }\n  if (version) {\n    whereClause.version = parseInt(version, 10); // Ensure version is an integer\n  }\n\n  try {\n    const transactions = await prisma.transaction.findMany({\n      where: whereClause,\n      include: {\n        // merchant: true, // Optional: include merchant details if needed\n        entries: {        // Include related entries\n          select: {\n            entry_id: true,\n            account_id: true,\n            entry_type: true,\n            amount: true,\n            currency: true,\n            status: true,\n            effective_date: true\n          }\n        }\n      },\n      orderBy: {\n        created_at: 'desc'\n      }\n    });\n    return transactions;\n  } catch (error) {\n    console.error(`Error fetching transactions for merchant ${merchantId}:`, error);\n    throw new Error('Could not retrieve transactions.');\n  }\n};\n\nmodule.exports = {\n  listTransactions,\n};"
      },
      "success_criteria": "src/server/core/transaction/index.js created with listTransactions function.",
      "status": "pending"
    },
    {
      "id": 6,
      "action": "Implement API Route for Listing Transactions",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/routes/transaction/index.js",
        "content": "const express = require('express');\nconst { listTransactions } = require('../../core/transaction');\nconst prisma = require('../../../services/prisma');\n\nconst router = express.Router({ mergeParams: true });\n\n/**\n * @swagger\n * tags:\n *   name: Transactions\n *   description: Financial transaction management (currently, only listing is supported).\n */\n\n/**\n * @swagger\n * /merchants/{merchantId}/transactions:\n *   get:\n *     summary: List transactions for a specific merchant.\n *     tags: [Transactions]\n *     description: Retrieves a list of transactions associated with the given merchant ID. Transactions are not created directly via API.\n *     parameters:\n *       - in: path\n *         name: merchantId\n *         required: true\n *         schema:\n *           type: string\n *         description: The ID of the merchant to retrieve transactions for.\n *       - in: query\n *         name: status\n *         schema:\n *           $ref: '#/components/schemas/TransactionStatusEnum'\n *         description: Optional. Filter transactions by status.\n *       - in: query\n *         name: logical_transaction_id\n *         schema:\n *           type: string\n *         description: Optional. Filter by logical transaction ID.\n *       - in: query\n *         name: version\n *         schema:\n *           type: integer\n *         description: Optional. Filter by transaction version.\n *     responses:\n *       200:\n *         description: A list of transactions.\n *         content:\n *           application/json:\n *             schema:\n *               type: array\n *               items:\n *                 $ref: '#/components/schemas/Transaction'\n *       404:\n *         description: Merchant not found.\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/ErrorResponse'\n *       500:\n *         description: Internal server error.\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/ErrorResponse'\n */\nrouter.get('/', async (req, res) => {\n  const { merchant_id } = req.params; // merchant_id from path due to mergeParams\n  const queryParams = req.query;\n\n  try {\n    const merchant = await prisma.merchantAccount.findUnique({ where: { merchant_id } });\n    if (!merchant) {\n      return res.status(404).json({ error: 'Merchant not found.' });\n    }\n\n    const transactions = await listTransactions(merchant_id, queryParams);\n    res.json(transactions);\n  } catch (error) {\n    console.error(`Failed to list transactions for merchant ${merchant_id}:`, error);\n    res.status(500).json({ error: 'Failed to retrieve transactions.' });\n  }\n});\n\nmodule.exports = router;"
      },
      "success_criteria": "src/server/routes/transaction/index.js created with GET / route and Swagger JSDoc.",
      "status": "pending"
    },
    {
      "id": 7,
      "action": "Mount Transaction Routes in Main Router",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/routes/index.js",
        "diff": [
          {
            "search": "const entryRoutes = require('./entry'); // Import entry routes",
            "replace": "const entryRoutes = require('./entry'); // Import entry routes\nconst transactionRoutes = require('./transaction'); // Import transaction routes"
          },
          {
            "search": "// Mount entry routes (nested under accounts)\nrouter.use('/accounts/:account_id/entries', entryRoutes);",
            "replace": "// Mount entry routes (nested under accounts)\nrouter.use('/accounts/:account_id/entries', entryRoutes);\n\n// Mount transaction routes (nested under merchants)\nrouter.use('/merchants/:merchant_id/transactions', transactionRoutes);"
          }
        ]
      },
      "success_criteria": "src/server/routes/index.js updated to import and use transactionRoutes.",
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
            "search": "        Entry: {",
            "replace": "        TransactionStatusEnum: {\n          type: 'string',\n          enum: ['EXPECTED', 'POSTED', 'MISMATCH', 'ARCHIVED'],\n          description: 'Status of a financial transaction.',\n          example: 'POSTED'\n        },\n        Transaction: {\n          type: 'object',\n          properties: {\n            transaction_id: { type: 'string', description: 'Unique ID of the transaction version.', example: 'clxmgmefg000208l3h4j5k6l7' },\n            logical_transaction_id: { type: 'string', description: 'Common ID for all versions of this logical transaction.', example: 'clxmgmefg000208l3h4j5k6l8' },\n            version: { type: 'integer', description: 'Version number of this transaction.', example: 1 },\n            merchant_id: { type: 'string', description: 'Merchant this transaction belongs to.' },\n            status: { $ref: '#/components/schemas/TransactionStatusEnum' },\n            created_at: { type: 'string', format: 'date-time' },\n            updated_at: { type: 'string', format: 'date-time' },\n            discarded_at: { type: 'string', format: 'date-time', nullable: true },\n            metadata: { type: 'object', nullable: true },\n            entries: {\n              type: 'array',\n              items: {\n                $ref: '#/components/schemas/Entry'\n              },\n              description: 'List of entries part of this transaction.'\n            }\n          }\n        },\n        Entry: {"
          }
        ]
      },
      "success_criteria": "src/config/swaggerDef.js updated with Transaction and TransactionStatusEnum schemas.",
      "status": "pending"
    },
    {
      "id": 9,
      "action": "Create Memory Bank Entity File",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/entities/transactions.md",
        "content": "# Entity: Transactions\n\n**Overview:**\nTransactions group one or more related `Entry` records that constitute a single, logical financial event or a distinct stage of an event. They support versioning for corrections.\n\n**Prisma Schema Definition (`Transaction` model from `prisma/schema.prisma`):**\n```prisma\nenum TransactionStatus {\n  EXPECTED\n  POSTED\n  MISMATCH\n  ARCHIVED\n}\n\nmodel Transaction {\n  transaction_id         String            @id @default(cuid())\n  logical_transaction_id String            @default(cuid())\n  version                Int               @default(1)\n  merchant_id            String            @db.VarChar(255)\n  status                 TransactionStatus\n  created_at             DateTime          @default(now())\n  updated_at             DateTime          @updatedAt\n  discarded_at           DateTime?\n  metadata               Json?             @db.JsonB\n\n  merchant               MerchantAccount   @relation(fields: [merchant_id], references: [merchant_id])\n  entries                Entry[]           // Relation to multiple entries\n\n  @@index([logical_transaction_id])\n  @@index([merchant_id])\n  @@index([status])\n  @@unique([logical_transaction_id, version])\n}\n```\n\n**API Endpoints:**\n- `GET /api/merchants/:merchant_id/transactions`: List transactions for the specified merchant. Supports filtering by `status`, `logical_transaction_id`, and `version` via query parameters.\n  - **Note:** There is no `POST` endpoint for creating transactions directly via the API. Transactions are created through internal system processes.\n\n**Core Logic (`src/server/core/transaction/index.js`):\n- `listTransactions(merchant_id, queryParams)`: Retrieves transactions for a given merchant, allowing filtering. Includes related entries.\n\n**Lifecycle & Purpose:**\n- `EXPECTED`: Contains at least one `expected` entry and no `pending_confirmation` or `mismatched` entries. Awaiting actuals.\n- `POSTED`: All constituent entries are `posted`, and the transaction is balanced (total debits = total credits).\n- `MISMATCH`: Discrepancies found during processing that require intervention.\n- `ARCHIVED`: This version of the transaction has been superseded by a newer version due to correction. `discarded_at` should be set.\n\n**Versioning for Corrections:**\nIf a `POSTED` transaction needs correction, its status becomes `ARCHIVED`. A new transaction is created with the same `logical_transaction_id` and an incremented `version`, containing the corrected set of entries.\n\n**Future Considerations:**\n- A join table (`TransactionEntry`) will be introduced to manage the many-to-many relationship between `Transaction` and `Entry` if a single entry could belong to multiple transactions (though current model implies Entry has one Transaction via `transaction_id`). For now, `Entry.transaction_id` provides a one-to-many from Transaction to Entry.\n- Internal processes will be responsible for creating `Transaction` records and linking `Entry` records to them."
      },
      "success_criteria": "memory-bank/entities/transactions.md created with documentation for the Transaction entity.",
      "status": "pending"
    },
    {
      "id": 10,
      "action": "Create Test Directory",
      "tool": "write_to_file",
      "args": {
        "path": "tests/transaction/.gitkeep",
        "content": ""
      },
      "success_criteria": "Directory tests/transaction/ is created.",
      "status": "pending"
    },
    {
      "id": 11,
      "action": "Implement API Tests for Listing Transactions",
      "tool": "write_to_file",
      "args": {
        "path": "tests/transaction/transaction.js",
        "content": "const request = require('supertest');\nconst app = require('../../src/app');\nconst prisma = require('../../src/services/prisma');\n\ndescribe('Transaction API - GET /api/merchants/:merchant_id/transactions', () => {\n  let testMerchant;\n  let testAccount; // For creating entries\n  const transactionsData = [];\n\n  beforeAll(async () => {\n    testMerchant = await prisma.merchantAccount.create({\n      data: {\n        merchant_id: `test_merchant_tx_${Date.now()}`,\n        merchant_name: 'Test Merchant for Transactions',\n      },\n    });\n\n    testAccount = await prisma.account.create({\n        data: {\n            merchant_id: testMerchant.merchant_id,\n            account_name: 'Test Account for Transaction Entries',\n            account_type: 'DEBIT_NORMAL',\n            currency: 'USD',\n        },\n    });\n\n    // Create sample transactions with entries\n    const tx1LogicalId = `logical_tx_1_${Date.now()}`;\n    const tx1 = await prisma.transaction.create({\n      data: {\n        merchant_id: testMerchant.merchant_id,\n        logical_transaction_id: tx1LogicalId,\n        status: 'POSTED',\n        version: 1,\n        entries: {\n          create: [\n            { account_id: testAccount.account_id, entry_type: 'DEBIT', amount: 100, currency: 'USD', status: 'POSTED', effective_date: new Date() },\n            { account_id: testAccount.account_id, entry_type: 'CREDIT', amount: 100, currency: 'USD', status: 'POSTED', effective_date: new Date() },\n          ]\n        }\n      },\n      include: { entries: true }\n    });\n    transactionsData.push(tx1);\n\n    const tx2 = await prisma.transaction.create({\n      data: {\n        merchant_id: testMerchant.merchant_id,\n        logical_transaction_id: `logical_tx_2_${Date.now()}`,\n        status: 'EXPECTED',\n        version: 1,\n        entries: {\n            create: [\n              { account_id: testAccount.account_id, entry_type: 'DEBIT', amount: 50, currency: 'USD', status: 'EXPECTED', effective_date: new Date() },\n            ]\n        }\n      },\n      include: { entries: true }\n    });\n    transactionsData.push(tx2);\n\n    // Archived version of tx1\n    const tx1_v2 = await prisma.transaction.create({\n        data: {\n          merchant_id: testMerchant.merchant_id,\n          logical_transaction_id: tx1LogicalId, // Same logical ID\n          status: 'ARCHIVED',\n          version: 2, // Incremented version\n          discarded_at: new Date(),\n          entries: {\n            create: [\n              { account_id: testAccount.account_id, entry_type: 'DEBIT', amount: 105, currency: 'USD', status: 'POSTED', effective_date: new Date() }, // Corrected amount\n              { account_id: testAccount.account_id, entry_type: 'CREDIT', amount: 105, currency: 'USD', status: 'POSTED', effective_date: new Date() },\n            ]\n          }\n        },\n        include: { entries: true }\n      });\n      transactionsData.push(tx1_v2);\n  });\n\n  afterAll(async () => {\n    // Clean up in reverse order of creation or by specific IDs\n    await prisma.entry.deleteMany({ where: { account_id: testAccount.account_id }});\n    await prisma.transaction.deleteMany({ where: { merchant_id: testMerchant.merchant_id } });\n    await prisma.account.delete({ where: { account_id: testAccount.account_id }});\n    await prisma.merchantAccount.delete({ where: { merchant_id: testMerchant.merchant_id } });\n    await prisma.$disconnect();\n  });\n\n  it('should list all transactions for a valid merchant ID', async () => {\n    const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/transactions`);\n    expect(response.statusCode).toBe(200);\n    expect(response.body).toBeInstanceOf(Array);\n    expect(response.body.length).toBe(transactionsData.length);\n    response.body.forEach(tx => {\n      expect(tx).toHaveProperty('transaction_id');\n      expect(tx).toHaveProperty('merchant_id', testMerchant.merchant_id);\n      expect(tx).toHaveProperty('status');\n      expect(tx).toHaveProperty('entries');\n      expect(tx.entries).toBeInstanceOf(Array);\n    });\n  });\n\n  it('should filter transactions by status=POSTED', async () => {\n    const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/transactions?status=POSTED`);\n    expect(response.statusCode).toBe(200);\n    const postedCount = transactionsData.filter(t => t.status === 'POSTED').length;\n    expect(response.body.length).toBe(postedCount);\n    response.body.forEach(tx => expect(tx.status).toBe('POSTED'));\n  });\n\n  it('should filter transactions by logical_transaction_id', async () => {\n    const logicalIdToTest = transactionsData[0].logical_transaction_id;\n    const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/transactions?logical_transaction_id=${logicalIdToTest}`);\n    expect(response.statusCode).toBe(200);\n    const logicalCount = transactionsData.filter(t => t.logical_transaction_id === logicalIdToTest).length;\n    expect(response.body.length).toBe(logicalCount);\n    response.body.forEach(tx => expect(tx.logical_transaction_id).toBe(logicalIdToTest));\n  });\n\n  it('should filter transactions by version for a specific logical_transaction_id', async () => {\n    const logicalIdToTest = transactionsData[0].logical_transaction_id;\n    const versionToTest = 1;\n    const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/transactions?logical_transaction_id=${logicalIdToTest}&version=${versionToTest}`);\n    expect(response.statusCode).toBe(200);\n    expect(response.body.length).toBe(1);\n    expect(response.body[0].logical_transaction_id).toBe(logicalIdToTest);\n    expect(response.body[0].version).toBe(versionToTest);\n  });\n\n  it('should return 404 if the merchant ID does not exist', async () => {\n    const nonExistentMerchantId = 'non-existent-merchant-id-123';\n    const response = await request(app).get(`/api/merchants/${nonExistentMerchantId}/transactions`);\n    expect(response.statusCode).toBe(404);\n    expect(response.body).toHaveProperty('error', 'Merchant not found.');\n  });\n});"
      },
      "success_criteria": "tests/transaction/transaction.js created with API tests for the GET /transactions endpoint.",
      "status": "pending"
    },
    {
      "id": 12,
      "action": "Update Memory Bank: activeContext.md",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/activeContext.md",
        "content": "# Active Context: Smart Ledger Backend (Node.js) - Transactions API\n\n**Current Focus:**\n- Implementation of the \"Transactions\" API, specifically the GET endpoint for listing transactions associated with a merchant.\n- Defining the `Transaction` model and `TransactionStatus` enum in Prisma.\n\n**Key Decisions & Design Points for Transactions API:**\n- **Database (`prisma/schema.prisma`):**\n  - New `TransactionStatus` enum: `EXPECTED`, `POSTED`, `MISMATCH`, `ARCHIVED`.\n  - New `Transaction` model: `transaction_id`, `logical_transaction_id`, `version`, `merchant_id`, `status`, `created_at`, `updated_at`, `discarded_at?`, `metadata?`.\n  - `Transaction` model has `entries Entry[]` relation.\n  - `Entry` model's `transaction_id` field updated to establish FK to `Transaction.transaction_id`.\n  - `MerchantAccount` model updated with `transactions Transaction[]` relation.\n- **API Endpoints:**\n  - `GET /api/merchants/:merchant_id/transactions`: Lists transactions for a specific merchant. Supports filtering by `status`, `logical_transaction_id`, `version`.\n  - **No direct creation API (`POST`) for Transactions.** They are intended to be created by internal system processes.\n- **Core Logic (`src/server/core/transaction/index.js`):\n  - `listTransactions(merchant_id, queryParams)`: Fetches transactions, includes related entries, orders by `created_at` descending.\n- **Routing:** New transaction router mounted at `/api/merchants/:merchant_id/transactions` with `mergeParams: true`.\n- **Documentation:**\n  - Swagger API documentation (`src/config/swaggerDef.js` and JSDoc in routes) to be updated.\n  - New Memory Bank entity file `memory-bank/entities/transactions.md` to be created.\n- **Testing:** API tests for the GET endpoint to be implemented in `tests/transaction/transaction.js`.\n\n**Next Steps (High-Level, during this task):**\n1.  Execute the plan for Transactions API (schema, migration, core logic, routes, docs, tests).\n2.  Ensure all tests pass.\n3.  Commit changes with a descriptive message (e.g., \"feat: Implement Transactions API (GET) and model\").\n\n**Future Considerations (Post-Transactions API):**\n- Implement the join table for `Transaction` and `Entry` if a many-to-many relationship is needed (current plan is one-to-many from Transaction to Entry).\n- Develop internal mechanisms for creating `Transaction` records and linking `Entry` records.\n- Implement logic for transaction balancing checks (`total debits = total credits` for `POSTED` status)."
      },
      "success_criteria": "memory-bank/activeContext.md updated to reflect current focus on Transactions API.",
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
            "replace": "---\n\n**2025-05-19 (Transactions API Implementation - Phase 1: GET Endpoint):**\n\n- **Task:** Define the `Transaction` model and `TransactionStatus` enum. Implement the GET API endpoint (`/api/merchants/:merchant_id/transactions`) for listing transactions, along with associated core logic, documentation, and tests. Transactions will not have a direct creation API in this phase.\n- **Status:** In Progress.\n\n---"
          }
        ]
      },
      "success_criteria": "memory-bank/progress.md updated with a new entry for the Transactions API task.",
      "status": "pending"
    }
  ]
}
-->
