# Entity: Reconciliation Rules (Recon Rules)

**Overview:**
Reconciliation Rules define a 1:1 mapping between two distinct accounts within a merchant's ledger system. These rules are fundamental for the automated expectation-matching process.

**Prisma Schema Definition (from `prisma/schema.prisma`):**

```prisma
model ReconRule {
  id               String   @id @default(cuid())
  merchant_id      String
  account_one_id   String
  account_two_id   String
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  merchant         MerchantAccount @relation(fields: [merchant_id], references: [merchant_id])
  accountOne       Account  @relation("ReconRuleAccountOne", fields: [account_one_id], references: [id])
  accountTwo       Account  @relation("ReconRuleAccountTwo", fields: [account_two_id], references: [id])

  @@unique([merchant_id, account_one_id, account_two_id], name: "unique_recon_rule_per_merchant")
  @@index([merchant_id])
  @@index([account_one_id])
  @@index([account_two_id])
}
```

**API Endpoints:**

- `POST /merchants/{merchant_id}/recon-rules`:

  - Creates a new reconciliation rule for a merchant
  - Request Body: `{ "account_one_id": "string", "account_two_id": "string" }`
  - Validates merchant ownership of accounts
  - Prevents duplicate rules within merchant scope
  - Returns 201 on success, 400 for validation errors, 500 for server errors

- `GET /merchants/{merchant_id}/recon-rules`:

  - Lists all reconciliation rules for a merchant
  - Includes account details for each rule
  - Returns 200 with array of rules, 500 for server errors

- `DELETE /merchants/{merchant_id}/recon-rules/{rule_id}`:
  - Deletes a specific reconciliation rule
  - Validates merchant ownership using both rule_id and merchant_id
  - Returns 404 if rule not found or belongs to different merchant
  - Returns 200 on success, 500 for server errors

**Core Logic (`src/server/core/recon-rules/index.js`):**

- `createReconRule(merchant_id, data)`:

  - Takes `merchant_id`, `account_one_id`, and `account_two_id`
  - Validates merchant existence and ownership
  - Creates new rule with merchant association
  - Handles unique constraint violations

- `listReconRules(merchant_id)`:

  - Retrieves all rules for a specific merchant
  - Includes account details through Prisma relations

- `deleteReconRule(merchant_id, rule_id)`:
  - Deletes a specific rule if it belongs to the merchant
  - Uses both rule_id and merchant_id in the where clause for deletion
  - Handles not found errors (P2025) appropriately

**Validation Rules:**

1. Merchant Validation:

   - Merchant must exist
   - Merchant must own both accounts
   - Rule must belong to merchant

2. Account Validation:

   - Both accounts must exist
   - Accounts must belong to the same merchant
   - Accounts must be different

3. Rule Validation:
   - No duplicate rules within merchant scope
   - Rule must belong to merchant for deletion (validated using both rule_id and merchant_id)

**Error Handling:**

1. Merchant Errors:

   - 400: Invalid merchant ID
   - 400: Merchant not found

2. Account Errors:

   - 400: Account not found
   - 400: Account belongs to different merchant
   - 400: Same account used for both sides

3. Rule Errors:
   - 400: Duplicate rule
   - 404: Rule not found or belongs to different merchant

**Purpose & Future Implications:**

- These rules form the basis for the 'recon engine'.
- **Rule Usage by Recon Engine (Based on `StagingEntryProcessingMode`):**
    - **`TRANSACTION` Mode (Generating new expectations):**
        - When a `StagingEntry` is processed in `TRANSACTION` mode (e.g., a PSP transaction file indicating funds moved from a PSP holding account), its `account_id` is treated as the "source" or "initiating" account.
        - The Recon Engine's `generateTransactionEntriesFromStaging` function will look for a `ReconRule` where `account_one_id` matches the `stagingEntry.account_id`.
        - If found, an `EXPECTED` entry is created for the `account_two_id` of that rule (e.g., a Bank account).
    - **`CONFIRMATION` Mode (Fulfilling existing expectations):**
        - When a `StagingEntry` is processed in `CONFIRMATION` mode (e.g., a bank statement entry), its `account_id` is treated as the "destination" or "expecting" account where a previously created `EXPECTED` entry should exist.
        - The Recon Engine's `processStagingEntryWithRecon` function will look for a `ReconRule` where `account_two_id` matches the `stagingEntry.account_id`.
        - If such a rule is found (and an `order_id` is present), the engine will attempt to find and match an existing `EXPECTED` entry in that `stagingEntry.account_id`.
- If multiple rules could potentially apply to an account, the refined logic ensures the rule matching the account's role (source for `TRANSACTION` mode, destination for `CONFIRMATION` mode) is selected.
- Rules are scoped to merchants, ensuring proper data isolation.
- The system uses these rules to:
  - Determine the correct contra-account for generating `EXPECTED` entries.
  - Conditionally attempt to match incoming `StagingEntry` records with existing `EXPECTED` entries.
  - Track expected vs actual entries.
  - Identify reconciliation mismatches.
  - Automate parts of the reconciliation process.

**User Stories:**

- As a merchant, I want to define mapping rules between my accounts for reconciliation purposes
- As a merchant, I want to view all my account mapping rules
- As a merchant, I want to delete specific mapping rules when they are no longer needed
- As a system administrator, I want to ensure rules are properly isolated between merchants
