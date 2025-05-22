# Active Context: Smart Ledger Backend (Node.js) - Account Name Update Feature

**Current Focus:**
- Adding functionality to update an existing account's name.

**Key Decisions & Changes (Account Name Update):**
1.  **Core Logic Update (`src/server/core/account/index.js`):**
    *   Added new async function `updateAccountName(merchantId, accountId, newAccountName)`.
    *   This function verifies account existence and ownership.
    *   It uses `prisma.account.update()` to change the `account_name`.
    *   Includes error handling for cases like account not found, merchant mismatch, and Prisma errors.
    *   The function is exported in `module.exports`.

2.  **Route Definition Update (`src/server/routes/account/index.js`):**
    *   Added a new `PUT /merchants/:merchant_id/accounts/:account_id` route.
    *   The route handler calls `accountCore.updateAccountName`.
    *   Includes input validation for `newAccountName` (must be a non-empty string).
    *   Handles errors from the core logic and returns appropriate HTTP status codes (200, 400, 404, 500).

3.  **Swagger Documentation Update (`src/server/routes/account/index.js`):**
    *   Added Swagger JSDoc comments for the new `PUT` endpoint.
    *   Defined a new schema `AccountNameUpdateInput` for the request body.
    *   Ensured `AccountNameUpdateInput` is correctly placed within `components: schemas:`.

**Memory Bank Updates:**
-   Updated `memory-bank/entities/accounts.md` to include:
    -   The new `PUT /api/merchants/:merchant_id/accounts/:account_id` endpoint.
    -   Details of the `updateAccountName` function in the Core Logic section.
    -   A new user story: "As a finance user, I want to be able to edit the name of an account."
-   This `activeContext.md` file.

**Next Steps (Immediate for this task):**
1.  Update `memory-bank/progress.md` to log the completion of this "update account name" feature.
2.  Present the completion of the task to the user.

**Broader Next Steps (Post this task):**
-   Implement TODOs:
    -   Add validation for `accountData` in `createAccount` (`src/server/core/account/index.js`).
    -   Add validation for `newAccountName` (length limits etc.) in `updateAccountName` (`src/server/core/account/index.js`).
    -   Add input validation for `req.body` in `POST /` route (`src/server/routes/account/index.js`) using Joi or Zod.
    -   Implement balance check before account deletion in `deleteAccount` (`src/server/core/account/index.js`).
-   Write automated tests for the new "update account name" functionality.
-   Consider refactoring other parts of the application to use the new logger service for consistency.
