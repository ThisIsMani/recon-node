## Plan: TypeScript Migration - Merchant API

**Objective:** Convert the Merchant API components (routes, core logic, and tests) to TypeScript.

**Date:** 2025-05-23
**Plan File:** `memory-bank/plans/2025-05-23-typescript-merchant-api.md`

**Phase 1: Merchant Core Logic Conversion**
- [ ] **1. Save this plan**
    - Action: Write this plan to `memory-bank/plans/2025-05-23-typescript-merchant-api.md`.
- [ ] **2. Read `src/server/core/merchant/index.js`**
- [ ] **3. Convert `src/server/core/merchant/index.js` to `src/server/core/merchant/index.ts`**
    - Action: Rename file, add TypeScript typings, update imports/exports.
- [ ] **4. Delete `src/server/core/merchant/index.js`**

**Phase 2: Merchant Routes Conversion**
- [ ] **5. Read `src/server/routes/merchant/index.js`**
- [ ] **6. Convert `src/server/routes/merchant/index.js` to `src/server/routes/merchant/index.ts`**
    - Action: Rename file, add TypeScript typings, update imports (especially for the core merchant logic).
- [ ] **7. Delete `src/server/routes/merchant/index.js`**

**Phase 3: Update Main Router**
- [ ] **8. Read `src/server/routes/index.js`**
- [ ] **9. Update `src/server/routes/index.js` to import the TypeScript merchant route**
    - Action: Change `require('./merchant')` to `require('./merchant').default` (or similar, depending on the export from the new `.ts` file).

**Phase 4: Merchant Tests Conversion & Fixing**
- [ ] **10. Read `tests/merchants/core/merchants.js` (Core Logic Tests)**
- [ ] **11. Convert `tests/merchants/core/merchants.js` to `tests/merchants/core/merchants.test.ts`**
    - Action: Rename file, add typings, update imports.
    - **Sub-task:** Address any Jest mock issues for Prisma client or other modules.
- [ ] **12. Delete `tests/merchants/core/merchants.js`**
- [ ] **13. Read `tests/merchants/merchants.js` (API/Route Tests)**
- [ ] **14. Convert `tests/merchants/merchants.js` to `tests/merchants/merchants.test.ts`**
    - Action: Rename file, add typings, update imports (e.g., for `supertest` and `app`).
    - **Sub-task:** Address any Jest mock issues.
- [ ] **15. Delete `tests/merchants/merchants.js`**

**Phase 5: Verification & Documentation**
- [ ] **16. Build the project**
    - Action: Run `npm run build`.
- [ ] **17. Run all tests**
    - Action: Execute `npm test`. Focus on ensuring merchant tests pass and no new failures are introduced.
- [ ] **18. Update Memory Bank**
    - Action: Update `memory-bank/activeContext.md` and `memory-bank/progress.md`. Note any specific patterns for fixing Jest mocks in `memory-bank/techContext.md` if applicable.

<!--
{
  "plan": [
    {
      "id": 1, "description": "Save this plan", "tool": "write_to_file", "args": {"path": "memory-bank/plans/2025-05-23-typescript-merchant-api.md", "content": "## Plan: TypeScript Migration - Merchant API\n\n**Objective:** Convert the Merchant API components (routes, core logic, and tests) to TypeScript.\n\n**Date:** 2025-05-23\n**Plan File:** `memory-bank/plans/2025-05-23-typescript-merchant-api.md`\n\n**Phase 1: Merchant Core Logic Conversion**\n- [ ] **1. Save this plan**\n    - Action: Write this plan to `memory-bank/plans/2025-05-23-typescript-merchant-api.md`.\n- [ ] **2. Read `src/server/core/merchant/index.js`**\n- [ ] **3. Convert `src/server/core/merchant/index.js` to `src/server/core/merchant/index.ts`**\n    - Action: Rename file, add TypeScript typings, update imports/exports.\n- [ ] **4. Delete `src/server/core/merchant/index.js`**\n\n**Phase 2: Merchant Routes Conversion**\n- [ ] **5. Read `src/server/routes/merchant/index.js`**\n- [ ] **6. Convert `src/server/routes/merchant/index.js` to `src/server/routes/merchant/index.ts`**\n    - Action: Rename file, add TypeScript typings, update imports (especially for the core merchant logic).\n- [ ] **7. Delete `src/server/routes/merchant/index.js`**\n\n**Phase 3: Update Main Router**\n- [ ] **8. Read `src/server/routes/index.js`**\n- [ ] **9. Update `src/server/routes/index.js` to import the TypeScript merchant route**\n    - Action: Change `require('./merchant')` to `require('./merchant').default` (or similar, depending on the export from the new `.ts` file).\n\n**Phase 4: Merchant Tests Conversion & Fixing**\n- [ ] **10. Read `tests/merchants/core/merchants.js` (Core Logic Tests)**\n- [ ] **11. Convert `tests/merchants/core/merchants.js` to `tests/merchants/core/merchants.test.ts`**\n    - Action: Rename file, add typings, update imports.\n    - **Sub-task:** Address any Jest mock issues for Prisma client or other modules.\n- [ ] **12. Delete `tests/merchants/core/merchants.js`**\n- [ ] **13. Read `tests/merchants/merchants.js` (API/Route Tests)**\n- [ ] **14. Convert `tests/merchants/merchants.js` to `tests/merchants/merchants.test.ts`**\n    - Action: Rename file, add typings, update imports (e.g., for `supertest` and `app`).\n    - **Sub-task:** Address any Jest mock issues.\n- [ ] **15. Delete `tests/merchants/merchants.js`**\n\n**Phase 5: Verification & Documentation**\n- [ ] **16. Build the project**\n    - Action: Run `npm run build`.\n- [ ] **17. Run all tests**\n    - Action: Execute `npm test`. Focus on ensuring merchant tests pass and no new failures are introduced.\n- [ ] **18. Update Memory Bank**\n    - Action: Update `memory-bank/activeContext.md` and `memory-bank/progress.md`. Note any specific patterns for fixing Jest mocks in `memory-bank/techContext.md` if applicable.\n\n<!--\n{ \"plan\": [ { \"id\": 1, ... self-reference ... } ] }\n-->"
      }, "success_criteria": "Plan file saved.", "status": "pending"
    },
    { "id": 2, "description": "Read src/server/core/merchant/index.js", "tool": "read_file", "args": { "path": "src/server/core/merchant/index.js" }, "success_criteria": "File content read.", "status": "pending" },
    { "id": 3, "description": "Convert src/server/core/merchant/index.js to .ts", "tool": "write_to_file", "args": { "path": "src/server/core/merchant/index.ts", "content": "/* ... TS content ... */" }, "success_criteria": ".ts file created.", "status": "pending" },
    { "id": 4, "description": "Delete src/server/core/merchant/index.js", "tool": "execute_command", "args": { "command": "rm src/server/core/merchant/index.js", "requires_approval": true }, "success_criteria": ".js file deleted.", "status": "pending" },
    { "id": 5, "description": "Read src/server/routes/merchant/index.js", "tool": "read_file", "args": { "path": "src/server/routes/merchant/index.js" }, "success_criteria": "File content read.", "status": "pending" },
    { "id": 6, "description": "Convert src/server/routes/merchant/index.js to .ts", "tool": "write_to_file", "args": { "path": "src/server/routes/merchant/index.ts", "content": "/* ... TS content ... */" }, "success_criteria": ".ts file created.", "status": "pending" },
    { "id": 7, "description": "Delete src/server/routes/merchant/index.js", "tool": "execute_command", "args": { "command": "rm src/server/routes/merchant/index.js", "requires_approval": true }, "success_criteria": ".js file deleted.", "status": "pending" },
    { "id": 8, "description": "Read src/server/routes/index.js", "tool": "read_file", "args": { "path": "src/server/routes/index.js" }, "success_criteria": "File content read.", "status": "pending" },
    { "id": 9, "description": "Update src/server/routes/index.js for merchant route", "tool": "replace_in_file", "args": { "path": "src/server/routes/index.js", "diff": "/* ... diff content ... */" }, "success_criteria": "Main router updated.", "status": "pending" },
    { "id": 10, "description": "Read tests/merchants/core/merchants.js", "tool": "read_file", "args": { "path": "tests/merchants/core/merchants.js" }, "success_criteria": "File content read.", "status": "pending" },
    { "id": 11, "description": "Convert tests/merchants/core/merchants.js to .test.ts", "tool": "write_to_file", "args": { "path": "tests/merchants/core/merchants.test.ts", "content": "/* ... TS test content ... */" }, "success_criteria": ".test.ts file created, mocks fixed.", "status": "pending" },
    { "id": 12, "description": "Delete tests/merchants/core/merchants.js", "tool": "execute_command", "args": { "command": "rm tests/merchants/core/merchants.js", "requires_approval": true }, "success_criteria": ".js test file deleted.", "status": "pending" },
    { "id": 13, "description": "Read tests/merchants/merchants.js", "tool": "read_file", "args": { "path": "tests/merchants/merchants.js" }, "success_criteria": "File content read.", "status": "pending" },
    { "id": 14, "description": "Convert tests/merchants/merchants.js to .test.ts", "tool": "write_to_file", "args": { "path": "tests/merchants/merchants.test.ts", "content": "/* ... TS test content ... */" }, "success_criteria": ".test.ts file created, mocks fixed.", "status": "pending" },
    { "id": 15, "description": "Delete tests/merchants/merchants.js", "tool": "execute_command", "args": { "command": "rm tests/merchants/merchants.js", "requires_approval": true }, "success_criteria": ".js test file deleted.", "status": "pending" },
    { "id": 16, "description": "Build the project", "tool": "execute_command", "args": { "command": "npm run build", "requires_approval": false }, "success_criteria": "Project builds successfully.", "status": "pending" },
    { "id": 17, "description": "Run all tests", "tool": "execute_command", "args": { "command": "npm test", "requires_approval": false }, "success_criteria": "All tests pass, especially merchant tests.", "status": "pending" },
    { "id": 18, "description": "Update Memory Bank", "tool": "write_to_file", "args": { "path": "memory-bank/activeContext.md", "content": "/* ... updated active context ... */" }, "success_criteria": "Memory Bank updated.", "status": "pending" }
  ]
}
-->
