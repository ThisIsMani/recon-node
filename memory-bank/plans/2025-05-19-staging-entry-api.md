# Plan: Implement Staging Entry API (2025-05-19)

This plan outlines the steps to implement the "Staging Entry" API for the Smart Ledger backend. Staging Entries represent financial movements that are in a temporary holding area before being processed or reviewed.

## Overall Goal
- Define the `StagingEntry` database model in Prisma, including its specific attributes and lifecycle statuses.
- Implement API endpoints for creating and listing staging entries, nested under a specific account (`/api/accounts/:account_id/staging-entries`).
- Ensure that the associated account for a staging entry exists.
- Follow established project structure, documentation practices (Swagger, Memory Bank), and testing procedures.

## StagingEntry Model Attributes
- `staging_entry_id`: String, Primary Key (e.g., `cuid()`)
- `account_id`: String, Foreign Key referencing `Account.account_id`
- `entry_type`: Enum (`DEBIT`, `CREDIT`)
- `amount`: Decimal
- `currency`: String (e.g., "USD", "EUR")
- `status`: Enum (`NEEDS_MANUAL_REVIEW`, `PROCESSED`)
- `effective_date`: DateTime
- `metadata`: JSON (optional)
- `discarded_at`: DateTime (nullable)
- `created_at`: DateTime
- `updated_at`: DateTime

## Steps

| Done | # | Action                                                                      | Detail                                                                                                                                                                                                                               |
|------|---|-----------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [ ]  | 1 | Update Prisma Schema (`prisma/schema.prisma`)                               | Add `StagingEntry` model (including `discarded_at`) and `StagingEntryStatus` enum. Define relation to `Account` model. Add shared `EntryType` enum.                                                                           |
| [ ]  | 2 | Generate and Apply Prisma Migration                                         | Run `npx prisma migrate dev --name add_staging_entries_table`.                                                                                                                                                                     |
| [ ]  | 3 | Create Directory Structure for Staging Entry API                            | Create `src/server/core/staging-entry/` and `src/server/routes/staging-entry/` following `.clinerules/entity-folder-structure.md`.                                                                                                 |
| [ ]  | 4 | Implement Staging Entry Core Logic (`src/server/core/staging-entry/index.js`) | `createStagingEntry(account_id, entryData)`: validates account existence, then creates the entry. `listStagingEntries(account_id, queryParams)`: retrieves entries for a specific account (possibly with filters). (Removed `updateStagingEntryStatus`). |
| [ ]  | 5 | Implement Staging Entry API Routes (`src/server/routes/staging-entry/index.js`) | `POST /` (relative to `/accounts/:account_id/staging-entries`) (body: entry attributes), `GET /` (relative to `/accounts/:account_id/staging-entries`). Router uses `mergeParams: true`. (Removed `PUT /status` endpoint).         |
| [ ]  | 6 | Mount Staging Entry Routes in Main Router (`src/server/routes/index.js`)      | Integrate the staging entry router at `/accounts/:account_id/staging-entries`.                                                                                                                                                       |
| [ ]  | 7 | Update Swagger Documentation                                                | Add JSDoc comments to routes for new paths. Update `src/config/swaggerDef.js` with `StagingEntry` and `StagingEntryStatus` schemas. (Remove PUT endpoint docs). Verify in `/api-docs`.                                            |
| [ ]  | 8 | Create Memory Bank Entity File (`memory-bank/entities/staging-entries.md`)  | Document the StagingEntry entity, its schema, API (nested POST, GET only), purpose, and lifecycle.                                                                                                                                   |
| [ ]  | 9 | Implement API Tests (`tests/staging-entry/staging-entry.js`)                | Write tests for `POST` and `GET` (nested under account_id) endpoints using Jest and Supertest. (Remove PUT endpoint tests).                                                                                                      |
| [ ]  | 10| Run All Tests                                                               | Execute `npm test` and ensure all tests, including new ones, pass.                                                                                                                                                                 |
| [ ]  | 11| Update Operational Memory Bank Docs                                         | Update `memory-bank/activeContext.md` and `memory-bank/progress.md` to reflect the development of the Staging Entry API (nested POST, GET only).                                                                                     |

<!--
{
  "planName": "Staging Entry API Implementation (Nested Routes)",
  "date": "2025-05-19",
  "steps": [
    {
      "id": 1,
      "action": "Update Prisma Schema",
      "tool": "replace_in_file",
      "args": {
        "path": "prisma/schema.prisma",
        "diff": [
          {
            "search": "enum AccountType {",
            "replace": "enum StagingEntryStatus {\n  NEEDS_MANUAL_REVIEW\n  PROCESSED\n}\n\nmodel StagingEntry {\n  staging_entry_id String               @id @default(cuid())\n  account_id         String\n  entry_type         EntryType // Assuming a shared EntryType enum: DEBIT, CREDIT\n  amount             Decimal\n  currency           String\n  status             StagingEntryStatus   @default(NEEDS_MANUAL_REVIEW)\n  effective_date     DateTime\n  metadata           Json?                @db.JsonB\n  discarded_at       DateTime?\n  created_at         DateTime             @default(now())\n  updated_at         DateTime             @updatedAt\n\n  account            Account              @relation(fields: [account_id], references: [account_id])\n\n  @@index([account_id])\n  @@index([status])\n  @@index([effective_date])\n}\n\nenum EntryType {\n  DEBIT\n  CREDIT\n}\n\nenum AccountType {"
          },
          {
            "search": "  reconRulesAsOne ReconRule[] @relation(\"ReconRuleAccountOne\")\n  reconRulesAsTwo ReconRule[] @relation(\"ReconRuleAccountTwo\")",
            "replace": "  reconRulesAsOne ReconRule[] @relation(\"ReconRuleAccountOne\")\n  reconRulesAsTwo ReconRule[] @relation(\"ReconRuleAccountTwo\")\n  stagingEntries  StagingEntry[]"
          }
        ]
      },
      "success_criteria": "StagingEntry model and StagingEntryStatus enum are defined in schema.prisma. A shared EntryType enum is also added. Account model updated with relation.",
      "status": "pending"
    },
    {
      "id": 2,
      "action": "Generate and Apply Prisma Migration",
      "tool": "execute_command",
      "args": {
        "command": "npx prisma migrate dev --name add_staging_entries_table",
        "requires_approval": true
      },
      "success_criteria": "Migration successfully created and applied. New 'StagingEntry' table exists.",
      "status": "pending"
    },
    {
      "id": 3,
      "action": "Create Directory Structure",
      "tool": "execute_command",
      "args": {
        "command": "mkdir -p src/server/core/staging-entry && mkdir -p src/server/routes/staging-entry",
        "requires_approval": false
      },
      "success_criteria": "Directories for staging-entry core logic and routes exist.",
      "status": "pending"
    },
    {
      "id": 4,
      "action": "Implement Staging Entry Core Logic",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/core/staging-entry/index.js",
        "content": "const prisma = require('../../../services/prisma');\n\nasync function createStagingEntry(account_id, entryData) {\n  const { entry_type, amount, currency, effective_date, metadata, discarded_at } = entryData;\n  if (!entry_type || amount == null || !currency || !effective_date) {\n    throw new Error('Missing required fields in body: entry_type, amount, currency, effective_date.');\n  }\n  const account = await prisma.account.findUnique({ where: { account_id } });\n  if (!account) {\n    throw new Error(`Account with ID ${account_id} not found.`);\n  }\n  try {\n    const newEntry = await prisma.stagingEntry.create({\n      data: {\n        account_id,\n        entry_type,\n        amount,\n        currency,\n        effective_date: new Date(effective_date),\n        metadata: metadata || undefined,\n        discarded_at: discarded_at ? new Date(discarded_at) : undefined,\n        // status defaults to NEEDS_MANUAL_REVIEW\n      },\n    });\n    return newEntry;\n  } catch (error) {\n    if (process.env.NODE_ENV !== 'test') {\n      console.error('Error creating staging entry:', error);\n    }\n    throw new Error('Could not create staging entry.');\n  }\n}\n\nasync function listStagingEntries(account_id, queryParams = {}) {\n  const whereClause = { account_id };\n  if (queryParams.status) {\n    whereClause.status = queryParams.status;\n  }\n  try {\n    const entries = await prisma.stagingEntry.findMany({ where: whereClause, include: { account: { select: { account_name: true, merchant_id: true } } } });\n    return entries;\n  } catch (error) {\n    if (process.env.NODE_ENV !== 'test') {\n      console.error('Error listing staging entries:', error);\n    }\n    throw new Error('Could not list staging entries.');\n  }\n}\n\nmodule.exports = {\n  createStagingEntry,\n  listStagingEntries,\n};\n"
      },
      "success_criteria": "Core logic for staging entry creation and listing implemented, accepting account_id as parameter.",
      "status": "pending"
    },
    {
      "id": 5,
      "action": "Implement Staging Entry API Routes",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/routes/staging-entry/index.js",
        "content": "const express = require('express');\nconst stagingEntryCore = require('../../core/staging-entry');\n\nconst router = express.Router({ mergeParams: true }); // Enable mergeParams to access :account_id\n\n/** @swagger \n * tags:\n *   name: StagingEntries\n *   description: Staging Entry management for pre-processing financial movements\n */\n\n/** @swagger\n * /accounts/{account_id}/staging-entries:\n *   post:\n *     summary: Create a new staging entry for a specific account\n *     tags: [StagingEntries]\n *     parameters:\n *       - { name: account_id, in: path, required: true, schema: { type: string }, description: 'ID of the account' }\n *     requestBody:\n *       required: true\n *       content:\n *         application/json:\n *           schema: $ref: '#/components/schemas/StagingEntryInput'\n *     responses:\n *       201: { description: 'Staging entry created', content: { application/json: { schema: $ref: '#/components/schemas/StagingEntry' } } }\n *       400: { description: 'Invalid input' }\n *       500: { description: 'Server error' }\n */\nrouter.post('/', async (req, res) => {\n  try {\n    const { account_id } = req.params;\n    const entry = await stagingEntryCore.createStagingEntry(account_id, req.body);\n    res.status(201).json(entry);\n  } catch (error) {\n    res.status(error.message.includes('not found') || error.message.includes('Missing required fields') ? 400 : 500).json({ error: error.message });\n  }\n});\n\n/** @swagger\n * /accounts/{account_id}/staging-entries:\n *   get:\n *     summary: List all staging entries for a specific account\n *     tags: [StagingEntries]\n *     parameters:\n *       - { name: account_id, in: path, required: true, schema: { type: string }, description: 'ID of the account' }\n *       - { name: status, in: query, schema: { type: string, enum: [NEEDS_MANUAL_REVIEW, PROCESSED] }, required: false }\n *     responses:\n *       200: { description: 'A list of staging entries', content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/StagingEntry' } } } } }\n *       500: { description: 'Server error' }\n */\nrouter.get('/', async (req, res) => {\n  try {\n    const { account_id } = req.params;\n    const entries = await stagingEntryCore.listStagingEntries(account_id, req.query);\n    res.status(200).json(entries);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nmodule.exports = router;\n"
      },
      "success_criteria": "API routes for staging entry POST and GET operations implemented with nested path.",
      "status": "pending"
    },
    {
      "id": 6,
      "action": "Mount Staging Entry Routes",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/routes/index.js",
        "diff": [
          {
            "search": "const reconRulesRoutes = require('./recon-rules');",
            "replace": "const reconRulesRoutes = require('./recon-rules');\nconst stagingEntryRoutes = require('./staging-entry');"
          },
          {
            "search": "router.use('/recon-rules', reconRulesRoutes);",
            "replace": "router.use('/recon-rules', reconRulesRoutes);\nrouter.use('/accounts/:account_id/staging-entries', stagingEntryRoutes);"
          }
        ]
      },
      "success_criteria": "Staging Entry routes mounted in main router under /accounts/:account_id/staging-entries.",
      "status": "pending"
    },
    {
      "id": 7,
      "action": "Update Swagger Documentation",
      "tool": "replace_in_file",
      "args": {
        "path": "src/config/swaggerDef.js",
        "diff": [
          {
            "search": "         HealthResponse: {",
            "replace": "        StagingEntryStatusEnum: {\n          type: 'string',\n          enum: ['NEEDS_MANUAL_REVIEW', 'PROCESSED'],\n          description: 'Status of a staging entry.'\n        },\n        EntryTypeEnum: {\n          type: 'string',\n          enum: ['DEBIT', 'CREDIT'],\n          description: 'Type of financial entry.'\n        },\n        StagingEntryInput: {\n          type: 'object',\n          required: ['entry_type', 'amount', 'currency', 'effective_date'],\n          properties: {\n            entry_type: { $ref: '#/components/schemas/EntryTypeEnum' },\n            amount: { type: 'number', format: 'decimal', description: 'Monetary amount.' },\n            currency: { type: 'string', description: '3-letter currency code.' },\n            effective_date: { type: 'string', format: 'date-time', description: 'Effective date of the entry.' },\n            metadata: { type: 'object', nullable: true, description: 'Optional JSON metadata.' },\n            discarded_at: { type: 'string', format: 'date-time', nullable: true, description: 'Timestamp if entry is discarded.' }\n          }\n        },\n        StagingEntry: {\n          type: 'object',\n          properties: {\n            staging_entry_id: { type: 'string', description: 'Unique ID of the staging entry.' },\n            account_id: { type: 'string' },\n            entry_type: { $ref: '#/components/schemas/EntryTypeEnum' },\n            amount: { type: 'number', format: 'decimal' },\n            currency: { type: 'string' },\n            status: { $ref: '#/components/schemas/StagingEntryStatusEnum' },\n            effective_date: { type: 'string', format: 'date-time' },\n            metadata: { type: 'object', nullable: true },\n            discarded_at: { type: 'string', format: 'date-time', nullable: true },\n            created_at: { type: 'string', format: 'date-time' },\n            updated_at: { type: 'string', format: 'date-time' }\n          }\n        },\n         HealthResponse: {"
          }
        ]
      },
      "success_criteria": "Swagger definition updated with StagingEntry schemas, reflecting account_id from path.",
      "status": "pending"
    },
    {
      "id": 8,
      "action": "Create Memory Bank Entity File for Staging Entries",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/entities/staging-entries.md",
        "content": "# Entity: Staging Entries\n\n**Overview:**\nStaging Entries represent financial movements that are captured in a temporary holding or pre-processing area. They allow for data ingestion, initial validation, and potential manual review before being transformed into final ledger entries or other processed states.\n\n**Prisma Schema Definition (`StagingEntry` model from `prisma/schema.prisma`):**\n```prisma\nenum StagingEntryStatus {\n  NEEDS_MANUAL_REVIEW\n  PROCESSED\n}\n\nmodel StagingEntry {\n  staging_entry_id String               @id @default(cuid())\n  account_id         String\n  entry_type         EntryType\n  amount             Decimal\n  currency           String\n  status             StagingEntryStatus   @default(NEEDS_MANUAL_REVIEW)\n  effective_date     DateTime\n  metadata           Json?                @db.JsonB\n  discarded_at       DateTime?\n  created_at         DateTime             @default(now())\n  updated_at         DateTime             @updatedAt\n\n  account            Account              @relation(fields: [account_id], references: [account_id])\n\n  @@index([account_id])\n  @@index([status])\n  @@index([effective_date])\n}\n\n// Shared enum, also used by StagingEntry\nenum EntryType {\n  DEBIT\n  CREDIT\n}\n```\n\n**API Endpoints:**\n- `POST /api/accounts/:account_id/staging-entries`: Create a new staging entry for the specified account.\n  - Request Body: `{ entry_type, amount, currency, effective_date, metadata?, discarded_at? }`\n- `GET /api/accounts/:account_id/staging-entries`: List staging entries for the specified account. Supports filtering by `status` via query parameters.\n\n**Core Logic (`src/server/core/staging-entry/index.js`):\n- `createStagingEntry(account_id, entryData)`: Creates a new entry for the given account_id.\n- `listStagingEntries(account_id, queryParams)`: Lists entries for the given account_id, allowing for filtering.\n\n**Lifecycle & Purpose:**\n- Staging entries serve as an initial capture point for financial data that may require validation or manual intervention.\n- `NEEDS_MANUAL_REVIEW`: Default state, or set if automated processing encounters issues.\n- `PROCESSED`: Indicates the entry has been handled (e.g., transformed into a final ledger entry, matched, or otherwise actioned). If an entry is effectively discarded as part of processing (e.g. a correction is made elsewhere), `discarded_at` can be set.\n- This entity is distinct from the final `Entry` model that will represent posted ledger movements."
      },
      "success_criteria": "Memory Bank file for Staging Entries updated with new API paths.",
      "status": "pending"
    },
    {
      "id": 9,
      "action": "Implement API Tests for Staging Entries",
      "tool": "write_to_file",
      "args": {
        "path": "tests/staging-entry/staging-entry.js",
        "content": "const request = require('supertest');\nconst app = require('../../src/app');\nconst prisma = require('../../src/services/prisma');\nconst stagingEntryCore = require('../../src/server/core/staging-entry'); // For direct use if needed\n\ndescribe('Staging Entry API Endpoints (Nested under Accounts)', () => {\n  let merchant, account, otherAccount;\n\n  beforeAll(async () => {\n    merchant = await prisma.merchantAccount.upsert({\n      where: { merchant_id: 'staging_nested_m001_jest' },\n      update: {},\n      create: { merchant_id: 'staging_nested_m001_jest', merchant_name: 'Staging Nested Test Merchant' },\n    });\n    account = await prisma.account.create({\n      data: {\n        merchant_id: merchant.merchant_id,\n        account_name: 'Staging Nested Test Account',\n        account_type: 'DEBIT_NORMAL',\n        currency: 'USD',\n      },\n    });\n    otherAccount = await prisma.account.create({\n        data: {\n            merchant_id: merchant.merchant_id,\n            account_name: 'Other Staging Nested Test Account',\n            account_type: 'CREDIT_NORMAL',\n            currency: 'EUR',\n        },\n    });\n  });\n\n  afterEach(async () => {\n    await prisma.stagingEntry.deleteMany({});\n  });\n\n  afterAll(async () => {\n    await prisma.stagingEntry.deleteMany({});\n    await prisma.account.deleteMany({ where: { merchant_id: merchant.merchant_id } });\n    await prisma.merchantAccount.delete({ where: { merchant_id: merchant.merchant_id } });\n    await prisma.$disconnect();\n  });\n\n  describe('POST /api/accounts/:account_id/staging-entries', () => {\n    it('should create a new staging entry successfully', async () => {\n      const entryData = {\n        entry_type: 'DEBIT',\n        amount: 100.50,\n        currency: 'USD',\n        effective_date: new Date().toISOString(),\n        metadata: { source: 'test' }\n      };\n      const response = await request(app).post(`/api/accounts/${account.account_id}/staging-entries`).send(entryData);\n      expect(response.statusCode).toBe(201);\n      expect(response.body).toHaveProperty('staging_entry_id');\n      expect(response.body.account_id).toBe(account.account_id);\n      expect(response.body.status).toBe('NEEDS_MANUAL_REVIEW');\n    });\n    // Add more POST tests: missing fields, invalid entry_type, non-existent account_id in path\n  });\n\n  describe('GET /api/accounts/:account_id/staging-entries', () => {\n    beforeEach(async () => {\n      await stagingEntryCore.createStagingEntry(account.account_id, { entry_type: 'CREDIT', amount: 50, currency: 'USD', effective_date: new Date() });\n      await stagingEntryCore.createStagingEntry(account.account_id, { entry_type: 'DEBIT', amount: 25, currency: 'USD', effective_date: new Date() });\n      await stagingEntryCore.createStagingEntry(otherAccount.account_id, { entry_type: 'DEBIT', amount: 75, currency: 'EUR', effective_date: new Date() });\n    });\n\n    it('should list staging entries only for the specified account_id', async () => {\n      const response = await request(app).get(`/api/accounts/${account.account_id}/staging-entries`);\n      expect(response.statusCode).toBe(200);\n      expect(response.body.length).toBe(2);\n      response.body.forEach(entry => expect(entry.account_id).toBe(account.account_id));\n    });\n    // Add tests for status filtering for the specified account_id\n  });\n});\n"
      },
      "success_criteria": "API tests for Staging Entries (nested POST, GET) created/updated.",
      "status": "pending"
    },
    {
      "id": 10,
      "action": "Run All Tests",
      "tool": "execute_command",
      "args": { "command": "npm test", "requires_approval": false },
      "success_criteria": "All API tests pass.",
      "status": "pending"
    },
    {
      "id": 11,
      "action": "Update Operational Memory Bank Docs",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/activeContext.md",
        "content": "# Active Context: Smart Ledger Backend (Node.js) (Staging Entry API Nested)\n\n**Current Focus:**\n- Refinement of the Staging Entry API to be nested under accounts.\n\n**Key Decisions & Outcomes (Staging Entry API Refinement):**\n- **API Endpoints:** Changed to `/api/accounts/:account_id/staging-entries` for POST and GET.\n- **Core Logic:** `createStagingEntry` and `listStagingEntries` in `src/server/core/staging-entry/` updated to accept `account_id` as a direct parameter.\n- **Routing:** Main router and staging entry router updated for nested paths.\n- **Testing:** Tests in `tests/staging-entry/staging-entry.js` updated for new paths.\n\n**Next Steps (High-Level):\n1.  Update `memory-bank/progress.md`.\n2.  Plan & implement final `Entry` and `Transaction` models and APIs.\n3.  Develop the \"recon engine\" logic."
      },
      "success_criteria": "activeContext.md updated. progress.md will be updated after all steps are done.",
      "status": "pending"
    }
  ]
}
-->
