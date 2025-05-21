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
- **Implied Roles & Conditional Matching:**
    - By convention, `account_one_id` is typically considered the "source" or "initiating" account in a transaction pair that generates an expectation.
    - `account_two_id` is typically considered the "destination" or "expecting" account, where an `EXPECTED` entry would be lodged, awaiting fulfillment.
    - The Recon Engine uses this convention: it will only attempt to match an incoming `StagingEntry` against existing `EXPECTED` entries if the `StagingEntry.account_id` corresponds to `account_two_id` in an active `ReconRule`. If the `StagingEntry.account_id` is `account_one_id`, or if no rule exists, a match attempt is bypassed, and the staging entry is typically flagged for manual review.
- When an event occurs related to `account_one_id` (e.g., a payment processed), and a `ReconRule` exists, the system (historically, or in future designs for auto-expectation generation) might automatically generate an 'expected entry' for the corresponding `account_two_id` with matching `order_id`, `amount`, and `currency`.
- Rules are scoped to merchants, ensuring proper data isolation.
- The system can use these rules to:
  - Conditionally attempt to match `StagingEntry` records with `EXPECTED` entries.
  - Track expected vs actual entries.
  - Identify reconciliation mismatches.
  - Automate parts of the reconciliation process.

**User Stories:**

- As a merchant, I want to define mapping rules between my accounts for reconciliation purposes
- As a merchant, I want to view all my account mapping rules
- As a merchant, I want to delete specific mapping rules when they are no longer needed
- As a system administrator, I want to ensure rules are properly isolated between merchants
