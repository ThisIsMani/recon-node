# Plan: Atomic Transaction and Entry Creation

**Date:** 2025-05-20
**Objective:** Refactor `createTransactionInternal` to ensure atomic creation of a transaction and its two associated entries (actual and expected), and to implement a balancing check (debits vs. credits).

## Pre-requisites:
- `generateTransactionEntriesFromStaging` function from `recon-engine/engine.js` is available and provides `[actualEntryData, expectedEntryData]`.

## Steps

| Done | # | Action                                                                 | Detail                                                                                                                                                                                                                                                           |
|------|---|------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [ ]  | 1 | Define `BalanceError` Custom Error                                     | In `src/server/core/transaction/index.js` (or a shared utils file), define a custom `BalanceError` for when debits do not equal credits.                                                                                                                          |
| [ ]  | 2 | Refactor `createEntryInternal` for Prisma Transactions                 | Modify `src/server/core/entry/index.js`: `createEntryInternal(entryData, tx)` to accept an optional Prisma transaction client (`tx`). If `tx` is provided, use `tx.model.operation`; otherwise, use global `prisma.model.operation`. Update validations. |
| [ ]  | 3 | Refactor `createTransactionInternal` Signature & Input Validation      | Modify `src/server/core/transaction/index.js`: `createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData, callingTx?)`. Validate inputs.                                                                                             |
| [ ]  | 4 | Implement Balancing Check in `createTransactionInternal`               | Add logic to ensure `actualEntryData.amount === expectedEntryData.amount`, `actualEntryData.currency === expectedEntryData.currency`, and one is DEBIT while the other is CREDIT. Throw `BalanceError` if not.                                                |
| [ ]  | 5 | Implement Atomic Operations using `prisma.$transaction`                | Wrap transaction and entry creation logic within `prisma.$transaction(async (tx) => { ... })`. Use the passed `tx` for all DB operations inside. If `callingTx` is provided, use that instead of creating a new `prisma.$transaction`.                     |
| [ ]  | 6 | Implement Transaction & Entry Creation within `prisma.$transaction`    | Inside the atomic block: create the `Transaction` shell using `tx.transaction.create`. Then, create the two `Entry` records using the refactored `entryCore.createEntryInternal(entryData, tx)`, linking them to the new transaction.                       |
| [ ]  | 7 | Update Unit Tests for `createEntryInternal`                            | In `tests/entry/core/entry.js`, update tests to reflect changes, including testing with and without a passed `tx` client.                                                                                                                                    |
| [ ]  | 8 | Create/Update Unit Tests for `createTransactionInternal`               | In `tests/transaction/core/transaction.js` (create if not exists): Test successful atomic creation, balancing check failures (amount, currency, type mismatch), and rollback scenarios (e.g., if an entry creation fails).                               |
| [ ]  | 9 | Update Memory Bank: `entities/transactions.md` & `entries.md`        | Reflect any changes to function signatures, behavior, and error handling.                                                                                                                                                                                        |
| [ ]  | 10| Update Memory Bank: `systemPatterns.md`                                | Document the use of `prisma.$transaction` for atomic operations in this context.                                                                                                                                                                                 |
| [ ]  | 11| Update Memory Bank: `activeContext.md` & `progress.md`                 | Summarize the changes and log completion of this refactoring task.                                                                                                                                                                                               |

<!--
{
  "planVersion": "1.0",
  "planName": "Atomic Transaction and Entry Creation",
  "lastUpdated": "2025-05-20T17:25:00Z",
  "plan": [
    {
      "id": 1,
      "action": "Define `BalanceError` Custom Error",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/transaction/index.js",
        "diff": "<<<<<<< SEARCH\nconst prisma = require('../../../services/prisma');\n=======\nconst prisma = require('../../../services/prisma');\n\nclass BalanceError extends Error {\n  constructor(message) {\n    super(message);\n    this.name = 'BalanceError';\n  }\n}\n>>>>>>> REPLACE"
      },
      "success": "`BalanceError` class defined.",
      "status": "pending"
    },
    {
      "id": 2,
      "action": "Refactor `createEntryInternal` for Prisma Transactions",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/entry/index.js",
        "diff": "..." // Diff to be detailed, involves adding tx param and conditional prisma/tx usage
      },
      "success": "`createEntryInternal` refactored to accept optional transaction client.",
      "status": "pending"
    },
    {
      "id": 3,
      "action": "Refactor `createTransactionInternal` Signature & Input Validation",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/transaction/index.js",
        "diff": "..." // Diff to be detailed for signature change and initial validation
      },
      "success": "`createTransactionInternal` signature updated and basic input validation added.",
      "status": "pending"
    },
    {
      "id": 4,
      "action": "Implement Balancing Check in `createTransactionInternal`",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/transaction/index.js",
        "diff": "..." // Diff to add balancing logic
      },
      "success": "Balancing check implemented in `createTransactionInternal`.",
      "status": "pending"
    },
    {
      "id": 5,
      "action": "Implement Atomic Operations using `prisma.$transaction`",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/transaction/index.js",
        "diff": "..." // Diff to wrap logic in prisma.$transaction or use callingTx
      },
      "success": "DB operations in `createTransactionInternal` wrapped in `prisma.$transaction` or use `callingTx`.",
      "status": "pending"
    },
    {
      "id": 6,
      "action": "Implement Transaction & Entry Creation within `prisma.$transaction`",
      "tool": "replace_in_file",
      "args": {
        "path": "src/server/core/transaction/index.js",
        "diff": "..." // Diff for actual creation logic using tx client
      },
      "success": "Transaction and entry creation logic updated to use transaction client.",
      "status": "pending"
    },
    {
      "id": 7,
      "action": "Update Unit Tests for `createEntryInternal`",
      "tool": "write_to_file", "args": {"path": "tests/entry/core/entry.test.js", "content": "..." },
      "success": "Unit tests for `createEntryInternal` updated/created.",
      "status": "pending"
    },
    {
      "id": 8,
      "action": "Create/Update Unit Tests for `createTransactionInternal`",
      "tool": "write_to_file", "args": {"path": "tests/transaction/core/transaction.test.js", "content": "..." },
      "success": "Unit tests for `createTransactionInternal` created/updated.",
      "status": "pending"
    },
    {
      "id": 9,
      "action": "Update Memory Bank: `entities/transactions.md` & `entries.md`",
      "tool": "replace_in_file", "args": {"path": "memory-bank/entities/transactions.md", "diff": "..."},
      "success": "Transaction and Entry entity docs updated.",
      "status": "pending"
    },
    {
      "id": 10,
      "action": "Update Memory Bank: `systemPatterns.md`",
      "tool": "replace_in_file", "args": {"path": "memory-bank/systemPatterns.md", "diff": "..."},
      "success": "System patterns doc updated for atomicity.",
      "status": "pending"
    },
    {
      "id": 11,
      "action": "Update Memory Bank: `activeContext.md` & `progress.md`",
      "tool": "replace_in_file", "args": {"path": "memory-bank/activeContext.md", "diff": "..."},
      "success": "Active context and progress docs updated.",
      "status": "pending"
    }
  ]
}
-->
