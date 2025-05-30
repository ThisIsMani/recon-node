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
  initial_balance Decimal   @default(0.00) @db.Decimal(19, 2) // Starting balance for the account
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
As of May 2025, the system calculates three types of balances dynamically by querying the Entry table and including the initial balance:

1. **Posted Balance**: Money that has fully settled in the account
   - DEBIT_NORMAL: initial_balance + posted debits - posted credits
   - CREDIT_NORMAL: initial_balance + posted credits - posted debits

2. **Pending Balance**: Includes money expected to settle plus settled money
   - DEBIT_NORMAL: initial_balance + pending debits - pending credits
   - CREDIT_NORMAL: initial_balance + pending credits - pending debits

3. **Available Balance**: Money available to be sent out
   - DEBIT_NORMAL: initial_balance + posted debits - pending credits
   - CREDIT_NORMAL: initial_balance + posted credits - pending debits

**Balance Calculation Implementation (`src/server/core/account/balance-calculator.ts`):**
- **`getEntrySums(accountId)`**: Queries Entry table for debit/credit sums
  - Posted sums: Entries with status = POSTED
  - Pending sums: Entries with status in [POSTED, EXPECTED]
- **`calculateAccountBalances(accountId, accountType, initialBalance)`**: Applies formulas based on account type, including the initial balance
- **`calculateMultipleAccountBalances(accounts)`**: Batch calculation for performance, includes each account's initial balance

**API Endpoints:**
- `POST /api/merchants/{merchant_id}/accounts`: Create a new account for a merchant
  - Request Body: `{ "account_name": "string", "account_type": "DEBIT_NORMAL|CREDIT_NORMAL", "currency": "USD", "initial_balance": "0.00" }`
  - Note: `initial_balance` is optional and defaults to 0.00 if not provided
  - Responses:
    - `201 Created`: Account created successfully
    - `400 Bad Request`: Invalid input (missing fields, invalid type, negative initial balance)
    - `404 Not Found`: Merchant not found
    - `500 Internal Server Error`: Other server-side errors

- `GET /api/merchants/{merchant_id}/accounts`: List all accounts with balances for a specific merchant
  - Response includes calculated balances (posted_balance, pending_balance, available_balance) that incorporate the initial balance
  - Response also includes the initial_balance field for each account
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
  - Creates account with provided merchant_id, account_name, account_type, currency, and optional initial_balance
  - Validates initial_balance is non-negative (if provided)
  - Returns created account

- **`listAccountsByMerchant(merchantId)`:**
  - Fetches all accounts for the merchant (including initial_balance)
  - Calculates balances for each account using balance-calculator, passing initial_balance
  - Returns accounts with calculated balances and initial_balance

- **`getAccountByIdWithBalances(merchantId, accountId)`:**
  - Fetches single account (including initial_balance)
  - Validates account belongs to merchant
  - Calculates and returns account with balances that include initial_balance

- **`deleteAccount(merchantId, accountId)`:**
  - Validates account belongs to merchant
  - Deletes account (no balance check currently)

- **`updateAccountName(merchantId, accountId, newAccountName)`:**
  - Validates account belongs to merchant
  - Updates account name

**User Stories:**
- As a finance user, I want to create different types of accounts (DEBIT_NORMAL for assets/expenses, CREDIT_NORMAL for liabilities/revenue/equity)
- As a finance user, I want to set an initial balance when creating an account to represent starting funds
- As a finance user, I want to view all accounts with their current balances (posted, pending, available)
- As a finance user, I want to understand how much money is settled vs. expected in each account
- As a finance user, I want to know how much money is available to spend from each account
- As a finance user, I want to see the initial balance separately from the calculated balances
- As a finance user, I want to update account names as needed
- As a finance user, I want to delete accounts that are no longer needed

**Testing:**
- Balance calculation tests (`tests/accounts/balance-calculator.test.ts`):
  - Tests for DEBIT_NORMAL and CREDIT_NORMAL balance calculations
  - Tests for balance calculations with initial balances
  - Tests for accounts with no entries but with initial balance
  - Tests for negative balances
  - Tests for batch balance calculation with initial balances
- Account API tests (`tests/accounts/accounts.test.ts`):
  - Tests for CRUD operations
  - Tests for account creation with initial balance
  - Tests for initial balance validation (non-negative)
  - Tests for merchant validation
  - Tests for error handling

**Technical Notes:**
- Balances are calculated on-demand rather than stored in the database
- This approach ensures data consistency and avoids complex balance update logic
- The initial_balance field is stored in the database and included in all balance calculations
- Initial balances represent the starting state of an account before any entries
- Performance is optimized through batch calculation when listing multiple accounts
- All monetary amounts (including initial_balance) are stored as Decimal type and returned as strings with 2 decimal places