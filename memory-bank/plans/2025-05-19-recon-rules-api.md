# Plan: Implement Recon Rules API (2025-05-19)

This plan outlines the steps to implement the "Recon Rules" API for the Smart Ledger backend. These rules will define a 1:1 mapping between two accounts.

## Overall Goal

- Define the `ReconRule` database model in Prisma.
- Implement API endpoints for creating and listing reconciliation rules.
- Ensure that the accounts specified in a rule exist before creating the rule.
- Follow established project structure, documentation practices (Swagger, Memory Bank), and testing procedures.

## Steps

| Done | #   | Action                                                                      | Detail                                                                                                                                                                                                                                  |
| ---- | --- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ ]  | 1   | Update Prisma Schema (`prisma/schema.prisma`)                               | Add `ReconRule` model with fields for `id` (PK), `account_one_id` (FK to Account `id`), `account_two_id` (FK to Account `id`), `created_at`, `updated_at`. Add relations and a unique constraint on `(account_one_id, account_two_id)`. |
| [ ]  | 2   | Generate and Apply Prisma Migration                                         | Run `npx prisma migrate dev --name add_recon_rules_table`.                                                                                                                                                                              |
| [ ]  | 3   | Create Directory Structure for Recon Rules API                              | Create `src/server/core/recon-rules/` and `src/server/routes/recon-rules/` following `.clinerules/entity-folder-structure.md`.                                                                                                          |
| [ ]  | 4   | Implement Recon Rules Core Logic (`src/server/core/recon-rules/index.js`)   | `createReconRule(data)`: validates existence of both account IDs, then creates the rule. `listReconRules()`: retrieves all rules.                                                                                                       |
| [ ]  | 5   | Implement Recon Rules API Routes (`src/server/routes/recon-rules/index.js`) | `POST /api/recon-rules` (body: `{ account_one_id, account_two_id }`), `GET /api/recon-rules`.                                                                                                                                           |
| [ ]  | 6   | Mount Recon Rules Routes in Main Router (`src/server/routes/index.js`)      | Integrate the recon rules router into the main API router.                                                                                                                                                                              |
| [ ]  | 7   | Update Swagger Documentation                                                | Add JSDoc comments to `src/server/routes/recon-rules/index.js`. Update `src/config/swaggerDef.js` with `ReconRule` schema. Verify in `/api-docs`.                                                                                       |
| [ ]  | 8   | Create Memory Bank Entity File (`memory-bank/entities/recon-rules.md`)      | Document the ReconRule entity, its schema, API, purpose, and relation to "expected entries" (as a future aspect).                                                                                                                       |
| [ ]  | 9   | Implement API Tests (`tests/recon-rules/recon-rules.js`)                    | Write tests for `POST` (create, duplicate, non-existent accounts) and `GET` (list) endpoints using Jest and Supertest.                                                                                                                  |
| [ ]  | 10  | Run All Tests                                                               | Execute `npm test` and ensure all tests, including new ones, pass.                                                                                                                                                                      |
| [ ]  | 11  | Update Operational Memory Bank Docs                                         | Update `memory-bank/activeContext.md` and `memory-bank/progress.md` to reflect the development of the Recon Rules API.                                                                                                                  |

<!--
{
  "planName": "Recon Rules API Implementation",
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
            "search": "model Account {",
            "replace": "model ReconRule {\n  id               String   @id @default(cuid())\n  account_one_id   String\n  account_two_id   String\n  created_at       DateTime @default(now())\n  updated_at       DateTime @updatedAt\n\n  accountOne       Account  @relation(\"ReconRuleAccountOne\", fields: [account_one_id], references: [id])\n  accountTwo       Account  @relation(\"ReconRuleAccountTwo\", fields: [account_two_id], references: [id])\n\n  @@unique([account_one_id, account_two_id], name: \"unique_recon_rule_pair\")\n  @@index([account_one_id])\n  @@index([account_two_id])\n}\n\nmodel Account {"
          }
        ]
      },
      "success_criteria": "ReconRule model is defined in schema.prisma with correct fields, relations, and unique constraint.",
      "status": "pending"
    },
    {
      "id": 2,
      "action": "Generate and Apply Prisma Migration",
      "tool": "execute_command",
      "args": {
        "command": "npx prisma migrate dev --name add_recon_rules_table",
        "requires_approval": true
      },
      "success_criteria": "Migration successfully created and applied. New 'ReconRule' table exists in the database.",
      "status": "pending"
    },
    {
      "id": 3,
      "action": "Create Directory Structure for Recon Rules API",
      "tool": "execute_command",
      "args": {
        "command": "mkdir -p src/server/core/recon-rules && mkdir -p src/server/routes/recon-rules",
        "requires_approval": false
      },
      "success_criteria": "Directories src/server/core/recon-rules/ and src/server/routes/recon-rules/ exist.",
      "status": "pending"
    },
    {
      "id": 4,
      "action": "Implement Recon Rules Core Logic",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/core/recon-rules/index.js",
        "content": "const prisma = require('../../../services/prisma');\n\nasync function createReconRule(data) {\n  const { account_one_id, account_two_id } = data;\n\n  if (!account_one_id || !account_two_id) {\n    throw new Error('Both account_one_id and account_two_id are required.');\n  }\n\n  if (account_one_id === account_two_id) {\n    throw new Error('Account IDs for a rule must be different.');\n  }\n\n  // Check if both accounts exist\n  const accountOne = await prisma.account.findUnique({ where: { id: account_one_id } });\n  if (!accountOne) {\n    throw new Error(`Account with ID ${account_one_id} not found.`);\n  }\n  const accountTwo = await prisma.account.findUnique({ where: { id: account_two_id } });\n  if (!accountTwo) {\n    throw new Error(`Account with ID ${account_two_id} not found.`);\n  }\n\n  try {\n    const newRule = await prisma.reconRule.create({\n      data: {\n        account_one_id,\n        account_two_id,\n      },\n    });\n    return newRule;\n  } catch (error) {\n    if (error.code === 'P2002') { // Unique constraint violation\n      throw new Error('A reconciliation rule with these account IDs already exists.');\n    }\n    console.error('Error creating recon rule:', error);\n    throw new Error('Could not create recon rule.');\n  }\n}\n\nasync function listReconRules() {\n  try {\n    const rules = await prisma.reconRule.findMany({\n      include: {\n        accountOne: { select: { id: true, name: true, merchant_id: true } },\n        accountTwo: { select: { id: true, name: true, merchant_id: true } },\n      }\n    });\n    return rules;\n  } catch (error) {\n    console.error('Error listing recon rules:', error);\n    throw new Error('Could not list recon rules.');\n  }\n}\n\nmodule.exports = {\n  createReconRule,\n  listReconRules,\n};\n"
      },
      "success_criteria": "Core logic for recon rule creation and listing is implemented in src/server/core/recon-rules/index.js.",
      "status": "pending"
    },
    {
      "id": 5,
      "action": "Implement Recon Rules API Routes",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/routes/recon-rules/index.js",
        "content": "const express = require('express');\nconst reconRulesCore = require('../../core/recon-rules');\n\nconst router = express.Router();\n\n/**\n * @swagger\n * tags:\n *   name: ReconRules\n *   description: Reconciliation Rule management\n */\n\n/**\n * @swagger\n * /recon-rules:\n *   post:\n *     summary: Create a new reconciliation rule\n *     tags: [ReconRules]\n *     requestBody:\n *       required: true\n *       content:\n *         application/json:\n *           schema:\n *             type: object\n *             required:\n *               - account_one_id\n *               - account_two_id\n *             properties:\n *               account_one_id:\n *                 type: string\n *                 description: ID of the first account in the mapping.\n *                 example: \"clxmgm62n000008l3g1k0h2j7\"\n *               account_two_id:\n *                 type: string\n *                 description: ID of the second account in the mapping.\n *                 example: \"clxmgmabc000108l3b2c1d4e5\"\n *     responses:\n *       201:\n *         description: Recon rule created successfully\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/ReconRule'\n *       400:\n *         description: Invalid input (e.g., missing fields, accounts not found, duplicate rule)\n *       500:\n *         description: Server error\n */\nrouter.post('/', async (req, res) => {\n  try {\n    const rule = await reconRulesCore.createReconRule(req.body);\n    res.status(201).json(rule);\n  } catch (error) {\n    if (error.message.includes('not found') || error.message.includes('required') || error.message.includes('must be different') || error.message.includes('already exists')) {\n      res.status(400).json({ error: error.message });\n    } else {\n      res.status(500).json({ error: 'Failed to create recon rule.' });\n    }\n  }\n});\n\n/**\n * @swagger\n * /recon-rules:\n *   get:\n *     summary: List all reconciliation rules\n *     tags: [ReconRules]\n *     responses:\n *       200:\n *         description: A list of reconciliation rules\n *         content:\n *           application/json:\n *             schema:\n *               type: array\n *               items:\n *                 $ref: '#/components/schemas/ReconRuleWithAccounts'\n *       500:\n *         description: Server error\n */\nrouter.get('/', async (req, res) => {\n  try {\n    const rules = await reconRulesCore.listReconRules();\n    res.status(200).json(rules);\n  } catch (error) {\n    res.status(500).json({ error: 'Failed to list recon rules.' });\n  }\n});\n\nmodule.exports = router;\n"
      },
      "success_criteria": "API routes for recon rule creation and listing are implemented in src/server/routes/recon-rules/index.js.",
      "status": "pending"
    },
    {
      "id": 6,
      "action": "Mount Recon Rules Routes in Main Router",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/routes/index.js",
        "diff": [
          {
            "search": "const accountRoutes = require('./account');",
            "replace": "const accountRoutes = require('./account');\nconst reconRulesRoutes = require('./recon-rules');"
          },
          {
            "search": "router.use('/merchants/:merchant_id/accounts', accountRoutes);",
            "replace": "router.use('/merchants/:merchant_id/accounts', accountRoutes);\nrouter.use('/recon-rules', reconRulesRoutes);"
          }
        ]
      },
      "success_criteria": "Recon Rules routes are correctly mounted in src/server/routes/index.js.",
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
            "search": "        }\n      }\n    },\n    apis: ['./src/server/routes/**/*.js']",
            "replace": "        },\n        ReconRule: {\n          type: 'object',\n          properties: {\n            id: { type: 'string', example: 'clxmgmefg000208l3h4j5k6l7' },\n            account_one_id: { type: 'string', example: 'clxmgm62n000008l3g1k0h2j7' },\n            account_two_id: { type: 'string', example: 'clxmgmabc000108l3b2c1d4e5' },\n            created_at: { type: 'string', format: 'date-time' },\n            updated_at: { type: 'string', format: 'date-time' }\n          }\n        },\n        ReconRuleWithAccounts: {\n          allOf: [\n            { $ref: '#/components/schemas/ReconRule' },\n            {\n              type: 'object',\n              properties: {\n                accountOne: { \n                  type: 'object', \n                  properties: { \n                    id: { type: 'string' }, \n                    name: { type: 'string' }, \n                    merchant_id: { type: 'string' } \n                  } \n                },\n                accountTwo: { \n                  type: 'object', \n                  properties: { \n                    id: { type: 'string' }, \n                    name: { type: 'string' }, \n                    merchant_id: { type: 'string' } \n                  } \n                }\n              }\n            }\n          ]\n        }\n      }\n    },\n    apis: ['./src/server/routes/**/*.js']"
          }
        ]
      },
      "success_criteria": "Swagger definition updated with ReconRule schemas. JSDoc comments added to recon-rules routes. Swagger UI reflects new endpoints.",
      "status": "pending"
    },
    {
      "id": 8,
      "action": "Create Memory Bank Entity File",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/entities/recon-rules.md",
        "content": "# Entity: Reconciliation Rules (Recon Rules)\n\n**Overview:**\nReconciliation Rules define a 1:1 mapping between two distinct accounts (e.g., a source account and a target account) within the Smart Ledger system. These rules are fundamental for the automated expectation-matching process.\n\n**Prisma Schema Definition (from `prisma/schema.prisma`):**\n```prisma\nmodel ReconRule {\n  id               String   @id @default(cuid())\n  account_one_id   String\n  account_two_id   String\n  created_at       DateTime @default(now())\n  updated_at       DateTime @updatedAt\n\n  accountOne       Account  @relation(\"ReconRuleAccountOne\", fields: [account_one_id], references: [id])\n  accountTwo       Account  @relation(\"ReconRuleAccountTwo\", fields: [account_two_id], references: [id])\n\n  @@unique([account_one_id, account_two_id], name: \"unique_recon_rule_pair\")\n  @@index([account_one_id])\n  @@index([account_two_id])\n}\n```\n\n**API Endpoints:**\n- `POST /api/recon-rules`:\n  - Creates a new reconciliation rule.\n  - Request Body: `{ \"account_one_id\": \"string\", \"account_two_id\": \"string\" }`\n  - Validates that both account IDs exist and are different.\n  - Prevents duplicate rules for the same pair of accounts.\n- `GET /api/recon-rules`:\n  - Lists all existing reconciliation rules, including details of the linked accounts.\n\n**Core Logic (`src/server/core/recon-rules/index.js`):\n- `createReconRule(data)`: Handles the creation of a new rule, including validation of account existence and uniqueness of the rule.\n- `listReconRules()`: Retrieves all rules with details of the associated accounts.\n\n**Purpose & Future Implications:**\n- These rules form the basis for the 'recon engine'.\n- As per the user's initial request: \"When created we should be able to create an expected entry with the same order_id, amount and currency, when recon engine sees this.\"\n- This implies that when an event occurs related to `account_one_id` (or `account_two_id`), and a `ReconRule` exists, the system might automatically generate an 'expected entry' for the corresponding `account_two_id` (or `account_one_id`) with matching `order_id`, `amount`, and `currency`. This functionality is part of the future 'recon engine' and not the rule creation API itself.\n\n**User Stories (Specific to Recon Rules):**\n- As a system administrator, I want to define a mapping rule between two accounts so that the system knows they are related for reconciliation purposes.\n- As a system administrator, I want to view all existing account mapping rules.\n"
      },
      "success_criteria": "memory-bank/entities/recon-rules.md created and populated.",
      "status": "pending"
    },
    {
      "id": 9,
      "action": "Implement API Tests",
      "tool": "write_to_file",
      "args": {
        "path": "tests/recon-rules/recon-rules.js",
        "content": "const request = require('supertest');\nconst app = require('../../src/app');\nconst prisma = require('../../src/services/prisma');\n\ndescribe('Recon Rules API Endpoints', () => {\n  let merchant1, account1_m1, account2_m1, account3_m1;\n\n  beforeAll(async () => {\n    // Create a merchant and some accounts for testing\n    merchant1 = await prisma.merchantAccount.create({\n      data: { merchant_id: 'recon_m001', merchant_name: 'Recon Test Merchant' },\n    });\n    account1_m1 = await prisma.account.create({\n      data: {\n        merchant_id: merchant1.id,\n        name: 'Recon Acc One',\n        type: 'ASSET',\n      },\n    });\n    account2_m1 = await prisma.account.create({\n      data: {\n        merchant_id: merchant1.id,\n        name: 'Recon Acc Two',\n        type: 'LIABILITY',\n      },\n    });\n    account3_m1 = await prisma.account.create({\n      data: {\n        merchant_id: merchant1.id,\n        name: 'Recon Acc Three',\n        type: 'REVENUE',\n      },\n    });\n  });\n\n  afterEach(async () => {\n    // Clean up recon rules after each test\n    await prisma.reconRule.deleteMany({});\n  });\n\n  afterAll(async () => {\n    // Clean up test data\n    await prisma.account.deleteMany({ where: { merchant_id: merchant1.id } });\n    await prisma.merchantAccount.delete({ where: { id: merchant1.id } });\n    await prisma.$disconnect();\n  });\n\n  describe('POST /api/recon-rules', () => {\n    it('should create a new recon rule successfully', async () => {\n      const response = await request(app)\n        .post('/api/recon-rules')\n        .send({ account_one_id: account1_m1.id, account_two_id: account2_m1.id });\n      expect(response.statusCode).toBe(201);\n      expect(response.body).toHaveProperty('id');\n      expect(response.body.account_one_id).toBe(account1_m1.id);\n      expect(response.body.account_two_id).toBe(account2_m1.id);\n    });\n\n    it('should return 400 if account_one_id is missing', async () => {\n      const response = await request(app)\n        .post('/api/recon-rules')\n        .send({ account_two_id: account2_m1.id });\n      expect(response.statusCode).toBe(400);\n      expect(response.body.error).toContain('account_one_id and account_two_id are required');\n    });\n\n    it('should return 400 if account_one_id does not exist', async () => {\n      const response = await request(app)\n        .post('/api/recon-rules')\n        .send({ account_one_id: 'nonexistent_id', account_two_id: account2_m1.id });\n      expect(response.statusCode).toBe(400);\n      expect(response.body.error).toContain('Account with ID nonexistent_id not found');\n    });\n\n    it('should return 400 if account_two_id does not exist', async () => {\n      const response = await request(app)\n        .post('/api/recon-rules')\n        .send({ account_one_id: account1_m1.id, account_two_id: 'nonexistent_id' });\n      expect(response.statusCode).toBe(400);\n      expect(response.body.error).toContain('Account with ID nonexistent_id not found');\n    });\n\n    it('should return 400 if account IDs are the same', async () => {\n      const response = await request(app)\n        .post('/api/recon-rules')\n        .send({ account_one_id: account1_m1.id, account_two_id: account1_m1.id });\n      expect(response.statusCode).toBe(400);\n      expect(response.body.error).toContain('Account IDs for a rule must be different');\n    });\n\n    it('should return 400 if rule already exists', async () => {\n      await reconRulesCore.createReconRule({ account_one_id: account1_m1.id, account_two_id: account2_m1.id });\n      const response = await request(app)\n        .post('/api/recon-rules')\n        .send({ account_one_id: account1_m1.id, account_two_id: account2_m1.id });\n      expect(response.statusCode).toBe(400);\n      expect(response.body.error).toContain('already exists');\n    });\n  });\n\n  describe('GET /api/recon-rules', () => {\n    it('should return an empty list if no rules exist', async () => {\n      const response = await request(app).get('/api/recon-rules');\n      expect(response.statusCode).toBe(200);\n      expect(response.body).toEqual([]);\n    });\n\n    it('should return a list of recon rules with account details', async () => {\n      await reconRulesCore.createReconRule({ account_one_id: account1_m1.id, account_two_id: account2_m1.id });\n      await reconRulesCore.createReconRule({ account_one_id: account2_m1.id, account_two_id: account3_m1.id });\n      \n      const response = await request(app).get('/api/recon-rules');\n      expect(response.statusCode).toBe(200);\n      expect(response.body.length).toBe(2);\n      expect(response.body[0]).toHaveProperty('accountOne');\n      expect(response.body[0].accountOne.name).toBe(account1_m1.name);\n      expect(response.body[0]).toHaveProperty('accountTwo');\n      expect(response.body[0].accountTwo.name).toBe(account2_m1.name);\n    });\n  });\n});\n"
      },
      "success_criteria": "API tests for recon rules created in tests/recon-rules/recon-rules.js.",
      "status": "pending"
    },
    {
      "id": 10,
      "action": "Run All Tests",
      "tool": "execute_command",
      "args": {
        "command": "npm test",
        "requires_approval": false
      },
      "success_criteria": "All API tests, including new recon rule tests, pass successfully.",
      "status": "pending"
    },
    {
      "id": 11,
      "action": "Update Operational Memory Bank Docs",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/activeContext.md",
        "content": "# Active Context: Smart Ledger Backend (Node.js) (as of 2025-05-19 - Post Recon Rules API)\n\n**Current Focus:**\n- Implementation of the Recon Rules API.\n\n**Key Decisions & Outcomes (Recon Rules API):**\n- **Database:** `ReconRule` model added to `prisma/schema.prisma` with `account_one_id`, `account_two_id` (both FKs to `Account.id`), and a unique constraint on the pair.\n- **API Endpoints:**\n  - `POST /api/recon-rules`: Creates a new rule. Validates account existence and rule uniqueness.\n  - `GET /api/recon-rules`: Lists all rules, including details of the linked accounts.\n- **Core Logic:** Implemented in `src/server/core/recon-rules/` for creation (with validation) and listing.\n- **Structure:** Followed entity folder structure (`.clinerules/entity-folder-structure.md`).\n- **Documentation:**\n  - Swagger API documentation updated.\n  - New Memory Bank entity file `memory-bank/entities/recon-rules.md` created.\n- **Testing:** API tests implemented in `tests/recon-rules/recon-rules.js`.\n\n**Next Steps (High-Level, post this task):**\n1.  Update `memory-bank/progress.md` to log the completion of the Recon Rules API.\n2.  Discuss and plan the database schema and APIs for \"Entries\" and \"Transactions\".\n    *   Define `Entry` model in `prisma/schema.prisma`.\n    *   Define `Transaction` model in `prisma/schema.prisma`.\n    *   Create `memory-bank/entities/entries.md` and `memory-bank/entities/transactions.md`.\n3.  Implement API endpoints for creating and managing entries and transactions.\n4.  Implement logic for on-the-fly balance calculations based on entries.\n5.  Write API tests for new Entry and Transaction endpoints.\n6.  Address TODOs from previous phases (robust input validation, balance check on account deletion).\n7.  Begin design/implementation of the \"recon engine\" that utilizes these rules to create \"expected entries\".\n\n**Open Questions/Considerations:**\n- Should the `(account_one_id, account_two_id)` unique constraint be order-agnostic? (e.g., (A,B) is the same as (B,A)). Currently, it is order-sensitive.\n- Further CRUD operations for Recon Rules (Update, Delete, Get by ID) if needed in the future."
      },
      "success_criteria": "activeContext.md updated. progress.md will be updated after all steps are done by appending to it.",
      "status": "pending"
    }
  ]
}
-->
