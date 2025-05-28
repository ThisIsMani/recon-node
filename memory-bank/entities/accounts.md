# Entity: Accounts

**Overview:**
Accounts represent ledger accounts within the Smart Ledger system, belonging to a specific Merchant. They are typed as either DEBIT_NORMAL or CREDIT_NORMAL, which determines how their balances are calculated. Accounts track financial movements through entries and provide three different balance views: posted, pending, and available.

**Prisma Schema Definition (from `prisma/schema.prisma`):**
```prisma
enum AccountType {
  DEBIT_NORMAL  // Balances increase with debits, decrease with credits (e.g., Asset, Expense)
  CREDIT_NORMAL // Balances increase with credits, decrease with debits (e.g., Liability, Revenue, Equity)
}

model Account {
  account_id    String      @id @default(uuid())
  merchant_id   String      @db.VarChar(255)
  account_name  String      @db.VarChar(255)
  account_type  AccountType
  currency      String      @db.VarChar(3) // E.g., "USD", "EUR"
  created_at    DateTime    @default(now())
  updated_at    DateTime    @updatedAt

  merchant      MerchantAccount @relation(fields: [merchant_id], references: [merchant_id])
  reconRulesAsOne ReconRule[] @relation("ReconRuleAccountOne")
  reconRulesAsTwo ReconRule[] @relation("ReconRuleAccountTwo")
  stagingEntries  StagingEntry[]
  entries         Entry[]     // Relation to Entry model

  @@index([merchant_id])
}
```

**Balance Calculation System:**
As of May 2025, the system calculates three types of balances dynamically by querying the Entry table:

1. **Posted Balance**: Money that has fully settled in the account
   - DEBIT_NORMAL: posted debits - posted credits
   - CREDIT_NORMAL: posted credits - posted debits

2. **Pending Balance**: Includes money expected to settle plus settled money
   - DEBIT_NORMAL: pending debits - pending credits
   - CREDIT_NORMAL: pending credits - pending debits

3. **Available Balance**: Money available to be sent out
   - DEBIT_NORMAL: posted debits - pending credits
   - CREDIT_NORMAL: posted credits - pending debits

**Balance Calculation Implementation (`src/server/core/account/balance-calculator.ts`):**
- **`getEntrySums(accountId)`**: Queries Entry table for debit/credit sums
  - Posted sums: Entries with status = POSTED
  - Pending sums: Entries with status in [POSTED, EXPECTED]
- **`calculateAccountBalances(accountId, accountType)`**: Applies formulas based on account type
- **`calculateMultipleAccountBalances(accounts)`**: Batch calculation for performance

**API Endpoints:**
- `POST /api/merchants/{merchant_id}/accounts`: Create a new account for a merchant
  - Request Body: `{ "account_name": "string", "account_type": "DEBIT_NORMAL|CREDIT_NORMAL", "currency": "USD" }`
  - Responses:
    - `201 Created`: Account created successfully
    - `400 Bad Request`: Invalid input (missing fields, invalid type)
    - `404 Not Found`: Merchant not found
    - `500 Internal Server Error`: Other server-side errors

- `GET /api/merchants/{merchant_id}/accounts`: List all accounts with balances for a specific merchant
  - Response includes calculated balances (posted_balance, pending_balance, available_balance)
  - Responses:
    - `200 OK`: Returns array of accounts with balances
    - `500 Internal Server Error`: Server-side errors

- `DELETE /api/merchants/{merchant_id}/accounts/{account_id}`: Delete an account
  - Responses:
    - `200 OK`: Account deleted successfully
    - `404 Not Found`: Account not found or doesn't belong to merchant
    - `500 Internal Server Error`: Server-side errors

- `PUT /api/merchants/{merchant_id}/accounts/{account_id}`: Update an account's name
  - Request Body: `{ "account_name": "string" }`
  - Responses:
    - `200 OK`: Account name updated successfully
    - `400 Bad Request`: Invalid input (missing or empty account_name)
    - `404 Not Found`: Account not found or doesn't belong to merchant
    - `500 Internal Server Error`: Other server-side errors

**Core Logic (`src/server/core/account/index.ts`):**
- **`createAccount(data)`:**
  - Validates merchant existence
  - Creates account with provided merchant_id, account_name, account_type, and currency
  - Returns created account

- **`listAccountsByMerchant(merchantId)`:**
  - Fetches all accounts for the merchant
  - Calculates balances for each account using balance-calculator
  - Returns accounts with calculated balances

- **`getAccountByIdWithBalances(merchantId, accountId)`:**
  - Fetches single account
  - Validates account belongs to merchant
  - Calculates and returns account with balances

- **`deleteAccount(merchantId, accountId)`:**
  - Validates account belongs to merchant
  - Deletes account (no balance check currently)

- **`updateAccountName(merchantId, accountId, newAccountName)`:**
  - Validates account belongs to merchant
  - Updates account name

**User Stories:**
- As a finance user, I want to create different types of accounts (DEBIT_NORMAL for assets/expenses, CREDIT_NORMAL for liabilities/revenue/equity)
- As a finance user, I want to view all accounts with their current balances (posted, pending, available)
- As a finance user, I want to understand how much money is settled vs. expected in each account
- As a finance user, I want to know how much money is available to spend from each account
- As a finance user, I want to update account names as needed
- As a finance user, I want to delete accounts that are no longer needed

**Testing:**
- Balance calculation tests (`tests/accounts/balance-calculator.test.ts`):
  - Tests for DEBIT_NORMAL and CREDIT_NORMAL balance calculations
  - Tests for accounts with no entries
  - Tests for negative balances
  - Tests for batch balance calculation
- Account API tests (`tests/accounts/accounts.test.ts`):
  - Tests for CRUD operations
  - Tests for merchant validation
  - Tests for error handling

**Technical Notes:**
- Balances are calculated on-demand rather than stored in the database
- This approach ensures data consistency and avoids complex balance update logic
- Performance is optimized through batch calculation when listing multiple accounts
- All monetary amounts are stored as Decimal type and returned as strings with 2 decimal places