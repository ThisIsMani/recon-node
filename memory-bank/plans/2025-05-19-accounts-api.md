# Plan: Implement Accounts API (2025-05-19)

This plan outlines the steps to implement the "Accounts" API for the Smart Ledger backend, associated with specific merchants.

## Overall Goal
- Define the `Account` database model linked to `MerchantAccount`.
- Implement API endpoints for creating, listing, and deleting accounts for a given merchant.
- Ensure balances are calculated on-the-fly (not stored).
- Follow established project structure and documentation practices.

## Steps

| Done | # | Action                                                                 | Detail                                                                                                                                                                                             |
|------|---|------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [ ]  | 1 | Update Prisma Schema (`prisma/schema.prisma`)                          | Add `Account` model (including `created_at` and `updated_at`) and `AccountType` enum. Remove `accounts Account[]` from `MerchantAccount` if still present. `created_at`/`updated_at` will not be in API responses. |
| [ ]  | 2 | Generate and Apply Prisma Migration                                    | Run `npx prisma migrate dev --name add_accounts_table`                                                                                                                                             |
| [ ]  | 3 | Create Directory Structure for Account API                             | Create `src/server/core/account/` and `src/server/routes/account/`                                                                                                                                 |
| [ ]  | 4 | Implement Account Core Logic (`src/server/core/account/index.js`)      | `createAccount(merchantId, data)`, `listAccountsByMerchant(merchantId)`, `deleteAccount(merchantId, accountId)`. (Balance check for delete is a TODO for now).                                      |
| [ ]  | 5 | Implement Account API Routes (`src/server/routes/account/index.js`)    | `POST /merchants/:merchant_id/accounts`, `GET /merchants/:merchant_id/accounts`, `DELETE /merchants/:merchant_id/accounts/:account_id`.                                                              |
| [ ]  | 6 | Mount Account Routes in Main Router (`src/server/routes/index.js`)     | Integrate the account router into the main API router.                                                                                                                                             |
| [ ]  | 7 | Update Swagger Documentation                                           | Add JSDoc comments to `src/server/routes/account/index.js` for the new endpoints. Verify in `/api-docs`.                                                                                             |
| [ ]  | 8 | Test Account API Endpoints                                             | Use `curl` to test Create, List, and Delete operations, including edge cases (e.g., non-existent merchant).                                                                                         |
| [ ]  | 9 | Update `README.md`                                                     | Document the new Account API endpoints and their usage.                                                                                                                                            |
| [ ]  | 10| Update Memory Bank (`activeContext.md`, `progress.md`)                 | Reflect the completion of the Accounts API implementation.                                                                                                                                         |

<!--
{
  "planName": "Accounts API Implementation",
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
            "search": "// accounts Account[]",
            "replace": ""
          },
          {
            "search": "// Future: Define other models for the Smart Ledger here\n// model Account { ... }\n// model Entry { ... }\n// model Transaction { ... }",
            "replace": "// Future: Define other models for the Smart Ledger here\n// model Entry { ... }\n// model Transaction { ... }\n\nmodel Account {\n  account_id    String      @id @default(uuid())\n  merchant_id   String      @db.VarChar(255)\n  account_name  String      @db.VarChar(255)\n  account_type  AccountType\n  currency      String      @db.VarChar(3) // E.g., \"USD\", \"EUR\"\n  created_at    DateTime    @default(now())\n  updated_at    DateTime    @updatedAt\n\n  merchant      MerchantAccount @relation(fields: [merchant_id], references: [merchant_id])\n\n  @@index([merchant_id])\n}\n\nenum AccountType {\n  DEBIT_NORMAL  // Balances increase with debits, decrease with credits (e.g., Asset, Expense)\n  CREDIT_NORMAL // Balances increase with credits, decrease with debits (e.g., Liability, Revenue, Equity)\n}"
          }
        ]
      },
      "success_criteria": "Account model and AccountType enum are defined in schema.prisma. `accounts` relation removed from MerchantAccount.",
      "status": "pending"
    },
    {
      "id": 2,
      "action": "Generate and Apply Prisma Migration",
      "tool": "execute_command",
      "args": {
        "command": "npx prisma migrate dev --name add_accounts_table",
        "requires_approval": true
      },
      "success_criteria": "Migration successfully created and applied. New 'Account' table exists in the database.",
      "status": "pending"
    },
    {
      "id": 3,
      "action": "Create Directory Structure for Account API",
      "tool": "execute_command",
      "args": {
        "command": "mkdir -p src/server/core/account && mkdir -p src/server/routes/account",
        "requires_approval": false
      },
      "success_criteria": "Directories src/server/core/account/ and src/server/routes/account/ exist.",
      "status": "pending"
    },
    {
      "id": 4,
      "action": "Implement Account Core Logic",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/core/account/index.js",
        "content": "// src/server/core/account/index.js\nconst prisma = require('../../../services/prisma');\n\n/**\n * Creates a new account for a specific merchant.\n * @param {string} merchantId - The ID of the merchant.\n * @param {object} accountData - Data for the new account.\n * @param {string} accountData.account_name - Name of the account.\n * @param {string} accountData.account_type - Type of the account (DEBIT_NORMAL, CREDIT_NORMAL).\n * @param {string} accountData.currency - Currency code (e.g., USD).\n * @returns {Promise<object>} The created account object.\n */\nasync function createAccount(merchantId, accountData) {\n  // TODO: Add validation for accountData\n  try {\n    const newAccount = await prisma.account.create({\n      data: {\n        merchant_id: merchantId,\n        account_name: accountData.account_name,\n        account_type: accountData.account_type,\n        currency: accountData.currency,\n      },\n    });\n    return newAccount;\n  } catch (error) {\n    // Handle potential errors, e.g., merchant_id not found if foreign key constraint fails\n    // For now, rethrow or log and throw a more specific error\n    console.error('Error creating account:', error);\n    throw new Error('Could not create account.');\n  }\n}\n\n/**\n * Lists all accounts for a specific merchant.\n * @param {string} merchantId - The ID of the merchant.\n * @returns {Promise<Array<object>>} A list of accounts.\n */\nasync function listAccountsByMerchant(merchantId) {\n  try {\n    const accounts = await prisma.account.findMany({\n      where: {\n        merchant_id: merchantId,\n      },\n      // TODO: Consider what fields to return, especially if balances are calculated on-the-fly\n    });\n    // For now, balances are not stored. They would be calculated here or by the caller.\n    return accounts.map(acc => ({ ...acc, posted_balance: '0.00', pending_balance: '0.00', available_balance: '0.00' })); // Placeholder balances\n  } catch (error) {\n    console.error('Error listing accounts:', error);\n    throw new Error('Could not list accounts.');\n  }\n}\n\n/**\n * Deletes a specific account for a merchant.\n * @param {string} merchantId - The ID of the merchant.\n * @param {string} accountId - The ID of the account to delete.\n * @returns {Promise<object>} The deleted account object.\n */\nasync function deleteAccount(merchantId, accountId) {\n  // TODO: Implement balance check (only delete if balances are zero) as a future enhancement.\n  // For now, this will delete the account regardless of balance.\n  try {\n    // First, verify the account belongs to the merchant to prevent accidental deletion across merchants if only accountId is used.\n    const account = await prisma.account.findUnique({\n      where: { account_id: accountId },\n    });\n\n    if (!account || account.merchant_id !== merchantId) {\n      throw new Error('Account not found or does not belong to the specified merchant.');\n    }\n\n    const deletedAccount = await prisma.account.delete({\n      where: {\n        account_id: accountId,\n      },\n    });\n    return deletedAccount;\n  } catch (error) {\n    console.error('Error deleting account:', error);\n    if (error.message.startsWith('Account not found')) throw error;\n    throw new Error('Could not delete account.');\n  }\n}\n\nmodule.exports = {\n  createAccount,\n  listAccountsByMerchant,\n  deleteAccount,\n};\n"
      },
      "success_criteria": "Core logic for account CRUD operations is implemented in src/server/core/account/index.js.",
      "status": "pending"
    },
    {
      "id": 5,
      "action": "Implement Account API Routes",
      "tool": "write_to_file",
      "args": {
        "path": "src/server/routes/account/index.js",
        "content": "// src/server/routes/account/index.js\nconst express = require('express');\nconst accountCore = require('../../core/account');\n\nconst router = express.Router({ mergeParams: true }); // mergeParams allows access to :merchant_id\n\n/**\n * @swagger\n * /merchants/{merchant_id}/accounts:\n *   post:\n *     summary: Create a new account for a merchant\n *     tags: [Accounts]\n *     parameters:\n *       - in: path\n *         name: merchant_id\n *         required: true\n *         schema:\n *           type: string\n *         description: The ID of the merchant\n *     requestBody:\n *       required: true\n *       content:\n *         application/json:\n *           schema:\n *             type: object\n *             required:\n *               - account_name\n *               - account_type\n *               - currency\n *             properties:\n *               account_name:\n *                 type: string\n *                 example: \"Main Operating Account\"\n *               account_type:\n *                 type: string\n *                 enum: [DEBIT_NORMAL, CREDIT_NORMAL]\n *                 example: \"DEBIT_NORMAL\"\n *               currency:\n *                 type: string\n *                 example: \"USD\"\n *     responses:\n *       201:\n *         description: Account created successfully\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/Account'\n *       400:\n *         description: Invalid input\n *       500:\n *         description: Server error\n */\nrouter.post('/', async (req, res) => {\n  const { merchant_id } = req.params;\n  try {\n    // TODO: Add input validation for req.body\n    const account = await accountCore.createAccount(merchant_id, req.body);\n    res.status(201).json(account);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\n/**\n * @swagger\n * /merchants/{merchant_id}/accounts:\n *   get:\n *     summary: List all accounts for a merchant\n *     tags: [Accounts]\n *     parameters:\n *       - in: path\n *         name: merchant_id\n *         required: true\n *         schema:\n *           type: string\n *         description: The ID of the merchant\n *     responses:\n *       200:\n *         description: A list of accounts\n *         content:\n *           application/json:\n *             schema:\n *               type: array\n *               items:\n *                 $ref: '#/components/schemas/AccountWithBalance'\n *       500:\n *         description: Server error\n */\nrouter.get('/', async (req, res) => {\n  const { merchant_id } = req.params;\n  try {\n    const accounts = await accountCore.listAccountsByMerchant(merchant_id);\n    res.status(200).json(accounts);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\n/**\n * @swagger\n * /merchants/{merchant_id}/accounts/{account_id}:\n *   delete:\n *     summary: Delete an account for a merchant\n *     tags: [Accounts]\n *     parameters:\n *       - in: path\n *         name: merchant_id\n *         required: true\n *         schema:\n *           type: string\n *         description: The ID of the merchant\n *       - in: path\n *         name: account_id\n *         required: true\n *         schema:\n *           type: string\n *         description: The ID of the account to delete\n *     responses:\n *       200:\n *         description: Account deleted successfully\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/Account'\n *       404:\n *         description: Account not found\n *       500:\n *         description: Server error\n */\nrouter.delete('/:account_id', async (req, res) => {\n  const { merchant_id, account_id } = req.params;\n  try {\n    const deletedAccount = await accountCore.deleteAccount(merchant_id, account_id);\n    if (!deletedAccount) { // Should be handled by core logic throwing an error\n        return res.status(404).json({ error: 'Account not found or could not be deleted.' });\n    }\n    res.status(200).json(deletedAccount);\n  } catch (error) {\n     if (error.message.startsWith('Account not found')) {\n        return res.status(404).json({ error: error.message });\n    }\n    res.status(500).json({ error: error.message });\n  }\n});\n\nmodule.exports = router;\n"
      },
      "success_criteria": "API routes for account CRUD operations are implemented in src/server/routes/account/index.js.",
      "status": "pending"
    },
    {
      "id": 6,
      "action": "Mount Account Routes in Main Router",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/routes/index.js",
        "diff": [
          {
            "search": "const merchantRoutes = require('./merchant');",
            "replace": "const merchantRoutes = require('./merchant');\nconst accountRoutes = require('./account');"
          },
          {
            "search": "router.use('/merchants', merchantRoutes);",
            "replace": "router.use('/merchants', merchantRoutes);\nrouter.use('/merchants/:merchant_id/accounts', accountRoutes); // Mount account routes nested under merchants"
          }
        ]
      },
      "success_criteria": "Account routes are correctly mounted in src/server/routes/index.js.",
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
            "search": "description: 'API documentation for the Smart Ledger application'",
            "replace": "description: 'API documentation for the Smart Ledger application, including Merchant and Account management.'"
          },
          {
            "search": "]\n      }\n    },\n    apis: ['./src/server/routes/**/*.js']",
            "replace": "]\n      }\n    },\n    components: {\n      schemas: {\n        MerchantAccount: {\n          type: 'object',\n          properties: {\n            merchant_id: {\n              type: 'string',\n              example: 'merchant_123'\n            },\n            merchant_name: {\n              type: 'string',\n              example: 'Test Merchant Inc.'\n            }\n          }\n        },\n        Account: {\n          type: 'object',\n          properties: {\n            account_id: {\n              type: 'string',\n              format: 'uuid',\n              example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'\n            },\n            merchant_id: {\n              type: 'string',\n              example: 'merchant_123'\n            },\n            account_name: {\n              type: 'string',\n              example: 'Operating Account'\n            },\n            account_type: {\n              type: 'string',\n              enum: ['DEBIT_NORMAL', 'CREDIT_NORMAL'],\n              example: 'DEBIT_NORMAL'\n            },\n            currency: {\n              type: 'string',\n              example: 'USD'\n            }\n            // created_at and updated_at are in the database model but intentionally excluded from this API schema\n          }\n        },\n        AccountWithBalance: {\n          allOf: [\n            { $ref: '#/components/schemas/Account' },\n            {\n              type: 'object',\n              properties: {\n                posted_balance: {\n                  type: 'string',\n                  example: '1000.50'\n                },\n                pending_balance: {\n                  type: 'string',\n                  example: '200.00'\n                },\n                available_balance: {\n                  type: 'string',\n                  example: '800.50'\n                }\n              }\n            }\n          ]\n        }\n      }\n    },\n    apis: ['./src/server/routes/**/*.js']"
          }
        ]
      },
      "success_criteria": "Swagger definition updated with Account schemas. JSDoc comments added to account routes. Swagger UI reflects new endpoints.",
      "status": "pending"
    },
    {
      "id": 8,
      "action": "Test Account API Endpoints",
      "tool": "execute_command",
      "args": {
        "command": "# Placeholder for curl commands - to be run by user or Cline if server is running\necho \"Testing Account API: Please run curl commands manually or confirm server is running for Cline to test.\"\n# Example POST: curl -X POST -H \"Content-Type: application/json\" -d '{\"account_name\":\"Test Savings\",\"account_type\":\"DEBIT_NORMAL\",\"currency\":\"USD\"}' http://localhost:3000/api/merchants/merchant_123/accounts\n# Example GET: curl http://localhost:3000/api/merchants/merchant_123/accounts\n# Example DELETE: curl -X DELETE http://localhost:3000/api/merchants/merchant_123/accounts/your_account_id",
        "requires_approval": false
      },
      "success_criteria": "Account API endpoints (Create, List, Delete) function as expected.",
      "status": "pending"
    },
    {
      "id": 9,
      "action": "Update README.md",
      "tool": "replace_in_file",
      "args": {
        "path": "README.md",
        "diff": [
          {
            "search": "### GET /api/merchants",
            "replace": "### GET /api/merchants\n\n### POST /api/merchants/:merchant_id/accounts\nCreate a new account for a specific merchant.\n- **Request Body:** `{\"account_name\": \"string\", \"account_type\": \"DEBIT_NORMAL\"|\"CREDIT_NORMAL\", \"currency\": \"string\"}`\n- **Response:** `201 Created` with the account object.\n\n### GET /api/merchants/:merchant_id/accounts\nList all accounts for a specific merchant.\n- **Response:** `200 OK` with an array of account objects (including placeholder balances).\n\n### DELETE /api/merchants/:merchant_id/accounts/:account_id\nDelete a specific account for a merchant.\n- **Response:** `200 OK` with the deleted account object or `404 Not Found`."
          }
        ]
      },
      "success_criteria": "README.md is updated with documentation for the Account API.",
      "status": "pending"
    },
    {
      "id": 10,
      "action": "Update Memory Bank",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/activeContext.md",
        "content": "# Active Context: Smart Ledger Backend (Node.js) (as of 2025-05-19)\n\n**Current Focus:**\n- Implementation of the Accounts API, following the Merchants API.\n\n**Key Decisions Made (Accounts API Planning):**\n- `Account` model in Prisma: `account_id` (PK), `merchant_id` (FK), `account_name`, `account_type` (enum: `DEBIT_NORMAL`, `CREDIT_NORMAL`), `currency`, `created_at`, `updated_at`.\n- `created_at` and `updated_at` fields are included in the `Account` model in `schema.prisma`, but will not be part of API responses for now.\n- Balances (`posted_balance`, `pending_balance`, `available_balance`) will be calculated on-the-fly for API responses, not stored in the database. Placeholder balances will be returned initially.\n- API endpoints: `POST /merchants/:merchant_id/accounts`, `GET /merchants/:merchant_id/accounts`, `DELETE /merchants/:merchant_id/accounts/:account_id`.\n- List API will be simple (no pagination for now).\n- Delete API will not have a balance check constraint initially (marked as TODO).\n- Followed entity-specific folder structure (`src/server/routes/account/`, `src/server/core/account/`).\n- Plan file created: `./memory-bank/plans/2025-05-19-accounts-api.md`.\n\n**Next Steps (Immediate from plan):**\n1.  Update Prisma Schema (`prisma/schema.prisma`) with `Account` model and `AccountType` enum.\n2.  Generate and Apply Prisma Migration (`npx prisma migrate dev --name add_accounts_table`).\n3.  Create Directory Structure for Account API (`src/server/core/account/`, `src/server/routes/account/`).\n4.  Implement Account Core Logic.\n5.  Implement Account API Routes.\n6.  Mount Account Routes in Main Router.\n7.  Update Swagger Documentation.\n8.  Test Account API Endpoints.\n9.  Update `README.md`.\n10. Update Memory Bank (`activeContext.md`, `progress.md`) upon completion.\n\n**Open Questions/Considerations:**\n- Detailed input validation for API requests.\n- Implementation of actual balance calculation logic."
      },
      "success_criteria": "activeContext.md updated. progress.md will be updated after all steps are done.",
      "status": "pending"
    }
  ]
}
-->
