# Entity: Accounts

**Overview:**
Accounts represent categories for money within the Smart Ledger system, belonging to a specific Merchant. They track financial balances and movements.

**Prisma Schema Definition (from `prisma/schema.prisma`):**
```prisma
enum AccountType {
  REVENUE
  EXPENSE
  ASSET
  LIABILITY
  EQUITY
  PSP_HOLDING // Funds held by Payment Service Provider
  BANK_ACCOUNT // Actual bank account
  // ... other types as needed
}

model Account {
  id                String        @id @default(cuid())
  merchant_id       String        // Foreign key to MerchantAccount
  merchant          MerchantAccount @relation(fields: [merchant_id], references: [id])
  account_number    String?       // Optional: external account number
  name              String        // User-defined name for the account
  type              AccountType
  balance           Float         @default(0.0) // Current balance (to be managed by entries)
  created_at        DateTime      @default(now())
  updated_at        DateTime      @updatedAt
  // entries           Entry[]    // Relation to Entry model (once Entry is defined)

  @@unique([merchant_id, name]) // Account names must be unique per merchant
}
```

**API Endpoints:**
- `POST /api/accounts`: Create a new account for a merchant.
  - Request Body: `{ "merchant_id": "string", "name": "string", "type": "AccountType" (e.g., "REVENUE") }`
  - Responses:
    - `201 Created`: Account created successfully.
    - `400 Bad Request`: Invalid input (e.g., missing fields, invalid `merchant_id`, invalid `type`, duplicate `name` for merchant).
    - `500 Internal Server Error`: Other server-side errors.
- `GET /api/accounts/:merchant_id`: List all accounts for a specific merchant.
  - Responses:
    - `200 OK`: Returns a list of accounts.
    - `404 Not Found`: If the merchant doesn't exist.
    - `500 Internal Server Error`: Server-side errors.
- `DELETE /api/accounts/:account_id`: Delete an account.
  - Responses:
    - `200 OK` or `204 No Content`: Account deleted successfully.
    - `400 Bad Request`: If account has a non-zero balance (TODO: implement this check).
    - `404 Not Found`: If the account doesn't exist.
    - `500 Internal Server Error`: Server-side errors.

**Core Logic (`src/server/core/account/index.js`):**
- **`createAccount(data)`:**
  - Takes `merchant_id`, `name`, and `type`.
  - Validates `merchant_id` existence.
  - Uses `prisma.account.create()` to save the new account.
  - Handles Prisma errors (e.g., unique constraint for `merchant_id`+`name`, invalid enum for `type`).
- **`getAccountsByMerchant(merchantId)`:**
  - Uses `prisma.account.findMany({ where: { merchant_id: merchantId } })`.
- **`deleteAccount(accountId)`:**
  - Uses `prisma.account.delete({ where: { id: accountId } })`.
  - TODO: Add check for non-zero balance before deletion.

**User Stories (Specific to Accounts):**
- As a finance user, I want to create different types of accounts (e.g., Revenue, Bank Account, PSP Holding) for a merchant to categorize funds.
- As a finance user, I want to view all accounts associated with a specific merchant.
- As a finance user, I want to delete an account if it's no longer needed and has a zero balance.
- As a finance user, I want to view the current balance of any account. (Balance calculation will be based on entries, this is a future feature).

**Data Flow (Creating an Account):**
1.  HTTP `POST` request to `/api/accounts` with `merchant_id`, `name`, and `type`.
2.  Route handler in `src/server/routes/account/index.js` receives the request.
3.  Input validation (including `AccountType` enum).
4.  `createAccount` core function in `src/server/core/account/index.js` is called.
5.  Prisma Client creates a new record in the `Account` table, linking to the `MerchantAccount`.
6.  Result (success or error) is returned.
7.  HTTP JSON response is sent.

**Testing (`tests/accounts/accounts.js`):**
- Tests cover successful creation, creation with non-existent merchant, invalid account type, duplicate account name for the same merchant, listing accounts, and deleting accounts.
