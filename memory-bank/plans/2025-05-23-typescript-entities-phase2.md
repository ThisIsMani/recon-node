## Plan: TypeScript Migration - Phase 2 (Accounts, ReconRules, StagingEntries, Transactions, Entries)

**Objective:** Continue the incremental TypeScript migration by converting the API components for Accounts, Recon Rules, Staging Entries, Transactions, and Entries.

**Date:** 2025-05-23
**Plan File:** `memory-bank/plans/2025-05-23-typescript-entities-phase2.md`

**General Approach for Each Entity:**
1.  Convert core logic file (`.js` to `.ts`).
2.  Convert routes file (`.js` to `.ts`).
3.  Update main router (`src/server/routes/index.js`) for the new TypeScript route.
4.  Convert test files (`.js` to `.test.ts`), addressing Jest mock issues.
5.  Run `npm run build` and `npm test` after each entity conversion to verify.

---
**Phase 1: Save This Plan**
- [ ] **1. Save this plan**
    - Action: Write this plan to `memory-bank/plans/2025-05-23-typescript-entities-phase2.md`.

---
**Phase 2: Accounts API Conversion**
- [ ] **2. Read `src/server/core/account/index.js`**
- [ ] **3. Convert `src/server/core/account/index.js` to `src/server/core/account/index.ts`**
- [ ] **4. Delete `src/server/core/account/index.js`**
- [ ] **5. Read `src/server/routes/account/index.js`**
- [ ] **6. Convert `src/server/routes/account/index.js` to `src/server/routes/account/index.ts`**
- [ ] **7. Delete `src/server/routes/account/index.js`**
- [ ] **8. Update `src/server/routes/index.js` for Account route** (change `require('./account')` to `require('./account').default`)
- [ ] **9. Read `tests/accounts/accounts.js`**
- [ ] **10. Convert `tests/accounts/accounts.js` to `tests/accounts/accounts.test.ts`** (address mock issues)
- [ ] **11. Delete `tests/accounts/accounts.js`**
- [ ] **12. Build & Test after Accounts API** (`npm run build && npm test`)

---
**Phase 3: Recon Rules API Conversion**
- [ ] **13. Read `src/server/core/recon-rules/index.js`**
- [ ] **14. Convert `src/server/core/recon-rules/index.js` to `src/server/core/recon-rules/index.ts`**
- [ ] **15. Delete `src/server/core/recon-rules/index.js`**
- [ ] **16. Read `src/server/routes/recon-rules/index.js`**
- [ ] **17. Convert `src/server/routes/recon-rules/index.js` to `src/server/routes/recon-rules/index.ts`**
- [ ] **18. Delete `src/server/routes/recon-rules/index.js`**
- [ ] **19. Update `src/server/routes/index.js` for Recon Rules route**
- [ ] **20. Read `tests/recon-rules/core/recon-rules.js`**
- [ ] **21. Convert `tests/recon-rules/core/recon-rules.js` to `tests/recon-rules/core/recon-rules.test.ts`** (address mock issues)
- [ ] **22. Delete `tests/recon-rules/core/recon-rules.js`**
- [ ] **23. Read `tests/recon-rules/recon-rules.js` (API tests)**
- [ ] **24. Convert `tests/recon-rules/recon-rules.js` to `tests/recon-rules/recon-rules.test.ts`** (address mock issues)
- [ ] **25. Delete `tests/recon-rules/recon-rules.js`**
- [ ] **26. Build & Test after Recon Rules API**

---
**Phase 4: Staging Entries API Conversion**
- [ ] **27. Read `src/server/core/staging-entry/index.js`**
- [ ] **28. Convert `src/server/core/staging-entry/index.js` to `src/server/core/staging-entry/index.ts`**
- [ ] **29. Delete `src/server/core/staging-entry/index.js`**
- [ ] **30. Read `src/server/routes/staging-entry/index.js`**
- [ ] **31. Convert `src/server/routes/staging-entry/index.js` to `src/server/routes/staging-entry/index.ts`**
- [ ] **32. Delete `src/server/routes/staging-entry/index.js`**
- [ ] **33. Update `src/server/routes/index.js` for Staging Entries route**
- [ ] **34. Read `tests/staging-entry/staging-entry.js`**
- [ ] **35. Convert `tests/staging-entry/staging-entry.js` to `tests/staging-entry/staging-entry.test.ts`** (address mock issues)
- [ ] **36. Delete `tests/staging-entry/staging-entry.js`**
- [ ] **37. Build & Test after Staging Entries API**

---
**Phase 5: Entries API Conversion**
- [ ] **38. Read `src/server/core/entry/index.js`**
- [ ] **39. Convert `src/server/core/entry/index.js` to `src/server/core/entry/index.ts`**
- [ ] **40. Delete `src/server/core/entry/index.js`**
- [ ] **41. Read `src/server/routes/entry/index.js`**
- [ ] **42. Convert `src/server/routes/entry/index.js` to `src/server/routes/entry/index.ts`**
- [ ] **43. Delete `src/server/routes/entry/index.js`**
- [ ] **44. Update `src/server/routes/index.js` for Entries route**
- [ ] **45. Read `tests/entry/core/entry.js`**
- [ ] **46. Convert `tests/entry/core/entry.js` to `tests/entry/core/entry.test.ts`** (address mock issues)
- [ ] **47. Delete `tests/entry/core/entry.js`**
- [ ] **48. Read `tests/entry/entry.js` (API tests)**
- [ ] **49. Convert `tests/entry/entry.js` to `tests/entry/entry.test.ts`** (address mock issues)
- [ ] **50. Delete `tests/entry/entry.js`**
- [ ] **51. Build & Test after Entries API**

---
**Phase 6: Transactions API Conversion**
- [ ] **52. Read `src/server/core/transaction/index.js`**
- [ ] **53. Convert `src/server/core/transaction/index.js` to `src/server/core/transaction/index.ts`**
- [ ] **54. Delete `src/server/core/transaction/index.js`**
- [ ] **55. Read `src/server/routes/transaction/index.js`**
- [ ] **56. Convert `src/server/routes/transaction/index.js` to `src/server/routes/transaction/index.ts`**
- [ ] **57. Delete `src/server/routes/transaction/index.js`**
- [ ] **58. Update `src/server/routes/index.js` for Transactions route**
- [ ] **59. Read `tests/transaction/core/transaction.js`**
- [ ] **60. Convert `tests/transaction/core/transaction.js` to `tests/transaction/core/transaction.test.ts`** (address mock issues)
- [ ] **61. Delete `tests/transaction/core/transaction.js`**
- [ ] **62. Read `tests/transaction/transaction.js` (API tests)**
- [ ] **63. Convert `tests/transaction/transaction.js` to `tests/transaction/transaction.test.ts`** (address mock issues)
- [ ] **64. Delete `tests/transaction/transaction.js`**
- [ ] **65. Build & Test after Transactions API**

---
**Phase 7: Final Documentation**
- [ ] **66. Update Memory Bank**
    - Action: Update `memory-bank/activeContext.md` and `memory-bank/progress.md`.
    - Action: Consolidate any learnings about Jest mocks into `memory-bank/techContext.md`.

<!--
{
  "plan": [
    { "id": 1, "description": "Save this plan", "tool": "write_to_file", "args": {"path": "memory-bank/plans/2025-05-23-typescript-entities-phase2.md", "content": "..." } },
    { "id": 2, "description": "Read Accounts Core JS", "tool": "read_file", "args": { "path": "src/server/core/account/index.js" } },
    { "id": 3, "description": "Convert Accounts Core to TS", "tool": "write_to_file", "args": { "path": "src/server/core/account/index.ts", "content": "..." } },
    { "id": 4, "description": "Delete Accounts Core JS", "tool": "execute_command", "args": { "command": "rm src/server/core/account/index.js", "requires_approval": true } },
    { "id": 5, "description": "Read Accounts Routes JS", "tool": "read_file", "args": { "path": "src/server/routes/account/index.js" } },
    { "id": 6, "description": "Convert Accounts Routes to TS", "tool": "write_to_file", "args": { "path": "src/server/routes/account/index.ts", "content": "..." } },
    { "id": 7, "description": "Delete Accounts Routes JS", "tool": "execute_command", "args": { "command": "rm src/server/routes/account/index.js", "requires_approval": true } },
    { "id": 8, "description": "Update Main Router for Accounts", "tool": "replace_in_file", "args": { "path": "src/server/routes/index.js", "diff": "..." } },
    { "id": 9, "description": "Read Accounts API Tests JS", "tool": "read_file", "args": { "path": "tests/accounts/accounts.js" } },
    { "id": 10, "description": "Convert Accounts API Tests to TS", "tool": "write_to_file", "args": { "path": "tests/accounts/accounts.test.ts", "content": "..." } },
    { "id": 11, "description": "Delete Accounts API Tests JS", "tool": "execute_command", "args": { "command": "rm tests/accounts/accounts.js", "requires_approval": true } },
    { "id": 12, "description": "Build & Test after Accounts", "tool": "execute_command", "args": { "command": "npm run build && npm test", "requires_approval": false } },
    { "id": 13, "description": "Read Recon Rules Core JS", "tool": "read_file", "args": { "path": "src/server/core/recon-rules/index.js" } },
    { "id": 14, "description": "Convert Recon Rules Core to TS", "tool": "write_to_file", "args": { "path": "src/server/core/recon-rules/index.ts", "content": "..." } },
    { "id": 15, "description": "Delete Recon Rules Core JS", "tool": "execute_command", "args": { "command": "rm src/server/core/recon-rules/index.js", "requires_approval": true } },
    { "id": 16, "description": "Read Recon Rules Routes JS", "tool": "read_file", "args": { "path": "src/server/routes/recon-rules/index.js" } },
    { "id": 17, "description": "Convert Recon Rules Routes to TS", "tool": "write_to_file", "args": { "path": "src/server/routes/recon-rules/index.ts", "content": "..." } },
    { "id": 18, "description": "Delete Recon Rules Routes JS", "tool": "execute_command", "args": { "command": "rm src/server/routes/recon-rules/index.js", "requires_approval": true } },
    { "id": 19, "description": "Update Main Router for Recon Rules", "tool": "replace_in_file", "args": { "path": "src/server/routes/index.js", "diff": "..." } },
    { "id": 20, "description": "Read Recon Rules Core Tests JS", "tool": "read_file", "args": { "path": "tests/recon-rules/core/recon-rules.js" } },
    { "id": 21, "description": "Convert Recon Rules Core Tests to TS", "tool": "write_to_file", "args": { "path": "tests/recon-rules/core/recon-rules.test.ts", "content": "..." } },
    { "id": 22, "description": "Delete Recon Rules Core Tests JS", "tool": "execute_command", "args": { "command": "rm tests/recon-rules/core/recon-rules.js", "requires_approval": true } },
    { "id": 23, "description": "Read Recon Rules API Tests JS", "tool": "read_file", "args": { "path": "tests/recon-rules/recon-rules.js" } },
    { "id": 24, "description": "Convert Recon Rules API Tests to TS", "tool": "write_to_file", "args": { "path": "tests/recon-rules/recon-rules.test.ts", "content": "..." } },
    { "id": 25, "description": "Delete Recon Rules API Tests JS", "tool": "execute_command", "args": { "command": "rm tests/recon-rules/recon-rules.js", "requires_approval": true } },
    { "id": 26, "description": "Build & Test after Recon Rules", "tool": "execute_command", "args": { "command": "npm run build && npm test", "requires_approval": false } },
    { "id": 27, "description": "Read Staging Entries Core JS", "tool": "read_file", "args": { "path": "src/server/core/staging-entry/index.js" } },
    { "id": 28, "description": "Convert Staging Entries Core to TS", "tool": "write_to_file", "args": { "path": "src/server/core/staging-entry/index.ts", "content": "..." } },
    { "id": 29, "description": "Delete Staging Entries Core JS", "tool": "execute_command", "args": { "command": "rm src/server/core/staging-entry/index.js", "requires_approval": true } },
    { "id": 30, "description": "Read Staging Entries Routes JS", "tool": "read_file", "args": { "path": "src/server/routes/staging-entry/index.js" } },
    { "id": 31, "description": "Convert Staging Entries Routes to TS", "tool": "write_to_file", "args": { "path": "src/server/routes/staging-entry/index.ts", "content": "..." } },
    { "id": 32, "description": "Delete Staging Entries Routes JS", "tool": "execute_command", "args": { "command": "rm src/server/routes/staging-entry/index.js", "requires_approval": true } },
    { "id": 33, "description": "Update Main Router for Staging Entries", "tool": "replace_in_file", "args": { "path": "src/server/routes/index.js", "diff": "..." } },
    { "id": 34, "description": "Read Staging Entries API Tests JS", "tool": "read_file", "args": { "path": "tests/staging-entry/staging-entry.js" } },
    { "id": 35, "description": "Convert Staging Entries API Tests to TS", "tool": "write_to_file", "args": { "path": "tests/staging-entry/staging-entry.test.ts", "content": "..." } },
    { "id": 36, "description": "Delete Staging Entries API Tests JS", "tool": "execute_command", "args": { "command": "rm tests/staging-entry/staging-entry.js", "requires_approval": true } },
    { "id": 37, "description": "Build & Test after Staging Entries", "tool": "execute_command", "args": { "command": "npm run build && npm test", "requires_approval": false } },
    { "id": 38, "description": "Read Entries Core JS", "tool": "read_file", "args": { "path": "src/server/core/entry/index.js" } },
    { "id": 39, "description": "Convert Entries Core to TS", "tool": "write_to_file", "args": { "path": "src/server/core/entry/index.ts", "content": "..." } },
    { "id": 40, "description": "Delete Entries Core JS", "tool": "execute_command", "args": { "command": "rm src/server/core/entry/index.js", "requires_approval": true } },
    { "id": 41, "description": "Read Entries Routes JS", "tool": "read_file", "args": { "path": "src/server/routes/entry/index.js" } },
    { "id": 42, "description": "Convert Entries Routes to TS", "tool": "write_to_file", "args": { "path": "src/server/routes/entry/index.ts", "content": "..." } },
    { "id": 43, "description": "Delete Entries Routes JS", "tool": "execute_command", "args": { "command": "rm src/server/routes/entry/index.js", "requires_approval": true } },
    { "id": 44, "description": "Update Main Router for Entries", "tool": "replace_in_file", "args": { "path": "src/server/routes/index.js", "diff": "..." } },
    { "id": 45, "description": "Read Entries Core Tests JS", "tool": "read_file", "args": { "path": "tests/entry/core/entry.js" } },
    { "id": 46, "description": "Convert Entries Core Tests to TS", "tool": "write_to_file", "args": { "path": "tests/entry/core/entry.test.ts", "content": "..." } },
    { "id": 47, "description": "Delete Entries Core Tests JS", "tool": "execute_command", "args": { "command": "rm tests/entry/core/entry.js", "requires_approval": true } },
    { "id": 48, "description": "Read Entries API Tests JS", "tool": "read_file", "args": { "path": "tests/entry/entry.js" } },
    { "id": 49, "description": "Convert Entries API Tests to TS", "tool": "write_to_file", "args": { "path": "tests/entry/entry.test.ts", "content": "..." } },
    { "id": 50, "description": "Delete Entries API Tests JS", "tool": "execute_command", "args": { "command": "rm tests/entry/entry.js", "requires_approval": true } },
    { "id": 51, "description": "Build & Test after Entries", "tool": "execute_command", "args": { "command": "npm run build && npm test", "requires_approval": false } },
    { "id": 52, "description": "Read Transactions Core JS", "tool": "read_file", "args": { "path": "src/server/core/transaction/index.js" } },
    { "id": 53, "description": "Convert Transactions Core to TS", "tool": "write_to_file", "args": { "path": "src/server/core/transaction/index.ts", "content": "..." } },
    { "id": 54, "description": "Delete Transactions Core JS", "tool": "execute_command", "args": { "command": "rm src/server/core/transaction/index.js", "requires_approval": true } },
    { "id": 55, "description": "Read Transactions Routes JS", "tool": "read_file", "args": { "path": "src/server/routes/transaction/index.js" } },
    { "id": 56, "description": "Convert Transactions Routes to TS", "tool": "write_to_file", "args": { "path": "src/server/routes/transaction/index.ts", "content": "..." } },
    { "id": 57, "description": "Delete Transactions Routes JS", "tool": "execute_command", "args": { "command": "rm src/server/routes/transaction/index.js", "requires_approval": true } },
    { "id": 58, "description": "Update Main Router for Transactions", "tool": "replace_in_file", "args": { "path": "src/server/routes/index.js", "diff": "..." } },
    { "id": 59, "description": "Read Transactions Core Tests JS", "tool": "read_file", "args": { "path": "tests/transaction/core/transaction.js" } },
    { "id": 60, "description": "Convert Transactions Core Tests to TS", "tool": "write_to_file", "args": { "path": "tests/transaction/core/transaction.test.ts", "content": "..." } },
    { "id": 61, "description": "Delete Transactions Core Tests JS", "tool": "execute_command", "args": { "command": "rm tests/transaction/core/transaction.js", "requires_approval": true } },
    { "id": 62, "description": "Read Transactions API Tests JS", "tool": "read_file", "args": { "path": "tests/transaction/transaction.js" } },
    { "id": 63, "description": "Convert Transactions API Tests to TS", "tool": "write_to_file", "args": { "path": "tests/transaction/transaction.test.ts", "content": "..." } },
    { "id": 64, "description": "Delete Transactions API Tests JS", "tool": "execute_command", "args": { "command": "rm tests/transaction/transaction.js", "requires_approval": true } },
    { "id": 65, "description": "Build & Test after Transactions", "tool": "execute_command", "args": { "command": "npm run build && npm test", "requires_approval": false } },
    { "id": 66, "description": "Update Memory Bank", "tool": "write_to_file", "args": { "path": "memory-bank/activeContext.md", "content": "..." } }
  ]
}
-->
