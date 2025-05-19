# Entity: Reconciliation Rules (Recon Rules)

**Overview:**
Reconciliation Rules define a 1:1 mapping between two distinct accounts (e.g., a source account and a target account) within the Smart Ledger system. These rules are fundamental for the automated expectation-matching process.

**Prisma Schema Definition (from `prisma/schema.prisma`):**
```prisma
model ReconRule {
  id               String   @id @default(cuid())
  account_one_id   String
  account_two_id   String
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  accountOne       Account  @relation("ReconRuleAccountOne", fields: [account_one_id], references: [account_id])
  accountTwo       Account  @relation("ReconRuleAccountTwo", fields: [account_two_id], references: [account_id])

  @@unique([account_one_id, account_two_id], name: "unique_recon_rule_pair")
  @@index([account_one_id])
  @@index([account_two_id])
}
```

**API Endpoints:**
- `POST /api/recon-rules`:
  - Creates a new reconciliation rule.
  - Request Body: `{ "account_one_id": "string", "account_two_id": "string" }`
  - Validates that both account IDs exist and are different.
  - Prevents duplicate rules for the same pair of accounts.
- `GET /api/recon-rules`:
  - Lists all existing reconciliation rules, including details of the linked accounts.

**Core Logic (`src/server/core/recon-rules/index.js`):**
- `createReconRule(data)`: Handles the creation of a new rule, including validation of account existence and uniqueness of the rule.
- `listReconRules()`: Retrieves all rules with details of the associated accounts.

**Purpose & Future Implications:**
- These rules form the basis for the 'recon engine'.
- As per the user's initial request: "When created we should be able to create an expected entry with the same order_id, amount and currency, when recon engine sees this."
- This implies that when an event occurs related to `account_one_id` (or `account_two_id`), and a `ReconRule` exists, the system might automatically generate an 'expected entry' for the corresponding `account_two_id` (or `account_one_id`) with matching `order_id`, `amount`, and `currency`. This functionality is part of the future 'recon engine' and not the rule creation API itself.

**User Stories (Specific to Recon Rules):**
- As a system administrator, I want to define a mapping rule between two accounts so that the system knows they are related for reconciliation purposes.
- As a system administrator, I want to view all existing account mapping rules.
