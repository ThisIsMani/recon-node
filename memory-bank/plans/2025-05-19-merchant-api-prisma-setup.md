# Plan: Merchant API Setup with Prisma (2025-05-19)

This plan outlines the steps to integrate Prisma for database management and implement the initial API endpoints for merchant accounts.

## Steps
| Done | # | Action                                                                 | Detail                                                                                                                               |
|------|---|------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| [ ]  | 1 | Install Prisma CLI and Client                                          | `npm install prisma --save-dev @prisma/client`                                                                                       |
| [ ]  | 2 | Initialize Prisma                                                      | `npx prisma init` (will create `prisma/schema.prisma`, update `.env`)                                                                |
| [ ]  | 3 | Configure `prisma/schema.prisma`                                       | Define PostgreSQL provider and `MerchantAccount` model (`merchant_id`, `merchant_name`).                                             |
| [ ]  | 4 | Update `.env` for Prisma's `DATABASE_URL`                              | Ensure `DATABASE_URL` in `.env` points to `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`.                  |
| [ ]  | 5 | Generate and Apply Initial Migration                                   | `npx prisma migrate dev --name init_merchant_accounts` (creates `./migrations`, applies SQL, generates Prisma Client).                |
| [ ]  | 6 | Create Prisma Service                                                  | Create `src/services/prisma.js` to initialize and export Prisma Client. Update health check if `database.js` is replaced.           |
| [ ]  | 7 | Create Merchant Module Directories                                     | `mkdir -p src/server/core/merchant src/server/routes/merchant`                                                                       |
| [ ]  | 8 | Implement Merchant Core Logic (`src/server/core/merchant/index.js`)    | `createMerchant(data)` and `listMerchants()` using Prisma Client.                                                                    |
| [ ]  | 9 | Implement Merchant Routes (`src/server/routes/merchant/index.js`)      | `POST /` and `GET /` routes calling core logic.                                                                                      |
| [ ]  | 10| Mount Merchant Router (`src/server/routes/index.js`)                   | Mount merchant routes at `/merchants`.                                                                                               |
| [ ]  | 11| Update Health Check (if `database.js` was replaced by `prisma.js`)     | Ensure `src/server/core/health.js` uses the new Prisma service for DB check.                                                         |
| [ ]  | 12| Test Merchant API Endpoints                                            | Manually test `POST /api/merchants` and `GET /api/merchants`.                                                                        |
| [ ]  | 13| Update `README.md`                                                     | Add Prisma setup, migration commands, and new merchant API documentation.                                                            |
| [ ]  | 14| Update Memory Bank Docs                                                | Update `projectbrief.md`, `systemPatterns.md`, `techContext.md`, `activeContext.md`, `progress.md` with Prisma and merchant API info. |

<!--
{
  "plan": [
    {
      "id": 1, "tool": "execute_command", "status": "pending",
      "args": {"command": "npm install prisma --save-dev @prisma/client", "requires_approval": true},
      "success_criteria": "Command output indicates successful installation."
    },
    {
      "id": 2, "tool": "execute_command", "status": "pending",
      "args": {"command": "npx prisma init", "requires_approval": true},
      "success_criteria": "Output indicates Prisma initialized; prisma/schema.prisma created; .env updated with DATABASE_URL."
    },
    {
      "id": 3, "tool": "write_to_file", "status": "pending",
      "args": {
        "path": "prisma/schema.prisma",
        "content": "datasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\ngenerator client {\n  provider = \"prisma-client-js\"\n}\n\nmodel MerchantAccount {\n  merchant_id   String @id @db.VarChar(255)\n  merchant_name String @db.VarChar(255)\n}"
      },
      "success_criteria": "File prisma/schema.prisma created/updated with correct content."
    },
    {
      "id": 4, "tool": "read_file", "status": "pending", "args": {"path": ".env"}, "next_action_description": "Verify DATABASE_URL in .env and update if necessary."
    },
    {
      "id": 5, "tool": "execute_command", "status": "pending",
      "args": {"command": "npx prisma migrate dev --name init_merchant_accounts", "requires_approval": true},
      "success_criteria": "Output indicates migration applied; ./migrations folder created with SQL; Prisma Client generated."
    },
    {
      "id": 6, "tool": "write_to_file", "status": "pending",
      "args": {
        "path": "src/services/prisma.js",
        "content": "const { PrismaClient } = require('@prisma/client');\nconst prisma = new PrismaClient();\n\n// Optional: Graceful shutdown hook for Prisma Client\n// async function shutdown() {\n//   await prisma.$disconnect();\n//   console.log('Prisma Client disconnected.');\n// }\n// process.on('SIGINT', shutdown);\n// process.on('SIGTERM', shutdown);\n\nmodule.exports = prisma;"
      },
      "success_criteria": "File src/services/prisma.js created with Prisma Client setup."
    },
    {
      "id": 7, "tool": "execute_command", "status": "pending",
      "args": {"command": "mkdir -p src/server/core/merchant src/server/routes/merchant", "requires_approval": false},
      "success_criteria": "Directories created successfully."
    },
    {
      "id": 8, "tool": "write_to_file", "status": "pending", "args": {"path": "src/server/core/merchant/index.js", "content": "// Merchant core logic using Prisma Client (to be implemented)"},
      "success_criteria": "File src/server/core/merchant/index.js created."
    },
    {
      "id": 9, "tool": "write_to_file", "status": "pending", "args": {"path": "src/server/routes/merchant/index.js", "content": "// Merchant routes (to be implemented)"},
      "success_criteria": "File src/server/routes/merchant/index.js created."
    },
    {
      "id": 10, "tool": "replace_in_file", "status": "pending", "args": {"path": "src/server/routes/index.js", "diff": "..." },
      "success_criteria": "Merchant router mounted in main router."
    },
    {
      "id": 11, "tool": "replace_in_file", "status": "pending", "args": {"path": "src/server/core/health.js", "diff": "..." },
      "success_criteria": "Health check uses Prisma service."
    },
    {
      "id": 12, "tool": "ask_followup_question", "status": "pending", "args": {"question": "Please test POST /api/merchants and GET /api/merchants. Report results."},
      "success_criteria": "User confirms API endpoints are working as expected."
    },
    {
      "id": 13, "tool": "replace_in_file", "status": "pending", "args": {"path": "README.md", "diff": "..." },
      "success_criteria": "README.md updated with Prisma and merchant API info."
    },
    {
      "id": 14, "tool": "write_to_file", "status": "pending", "args": {"path": "./memory-bank/...", "content": "..." },
      "success_criteria": "Relevant Memory Bank documents updated."
    }
  ]
}
-->
