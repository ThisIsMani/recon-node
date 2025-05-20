# Plan: Implement Merchant-Associated Recon Rules API (2025-05-20)

This plan outlines the steps to implement the "Recon Rules" API for the Smart Ledger backend, with merchant association. These rules will define a 1:1 mapping between two accounts within a merchant's ledger system.

## Overall Goal

- Update the `ReconRule` database model in Prisma to include merchant association.
- Implement API endpoints for creating, listing, and deleting reconciliation rules.
- Ensure proper validation of merchant ownership and account existence.
- Follow established project structure, documentation practices (Swagger, Memory Bank), and testing procedures.

## Steps

| Done | #   | Action                                                       | Detail                                                                                                                                        |
| ---- | --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | 1   | Update Prisma Schema (`prisma/schema.prisma`)                | Add `merchant_id` field to `ReconRule` model, establish relation with `MerchantAccount`, and update unique constraint to include merchant_id. |
| [x]  | 2   | Generate and Apply Prisma Migration                          | Run `npx prisma migrate dev --name add_merchant_to_recon_rules`.                                                                              |
| [x]  | 3   | Update Core Logic (`src/server/core/recon-rules/index.js`)   | Update `createReconRule`, `listReconRules`, and add `deleteReconRule` functions with merchant validation.                                     |
| [x]  | 4   | Update API Routes (`src/server/routes/recon-rules/index.js`) | Update routes to be nested under merchants: `POST`, `GET`, and `DELETE` endpoints with merchant validation.                                   |
| [x]  | 5   | Update Swagger Documentation                                 | Update JSDoc comments and `src/config/swaggerDef.js` with merchant-associated ReconRule schema.                                               |
| [x]  | 6   | Update Memory Bank Entity File                               | Update `memory-bank/entities/recon-rules.md` with merchant association details.                                                               |
| [x]  | 7   | Implement API Tests                                          | Write tests for merchant-associated recon rules in `tests/recon-rules/recon-rules.js`.                                                        |
| [x]  | 8   | Run All Tests                                                | Execute `npm test` and ensure all tests pass.                                                                                                 |
| [x]  | 9   | Update Memory Bank Docs                                      | Update `memory-bank/activeContext.md` and `memory-bank/progress.md` to reflect merchant association implementation.                           |

## Implementation Details

### 1. Database Schema Update

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

### 2. API Endpoints

#### POST /merchants/{merchant_id}/recon-rules

- Creates a new reconciliation rule for a merchant
- Validates merchant ownership of accounts
- Prevents duplicate rules within merchant scope

#### GET /merchants/{merchant_id}/recon-rules

- Lists all reconciliation rules for a merchant
- Includes account details for each rule

#### DELETE /merchants/{merchant_id}/recon-rules/{rule_id}

- Deletes a specific reconciliation rule
- Validates merchant ownership using both rule_id and merchant_id
- Returns 404 if rule not found or belongs to different merchant

### 3. Core Logic Functions

#### createReconRule(merchant_id, data)

- Validates merchant existence
- Validates account ownership by merchant
- Creates rule with merchant association

#### listReconRules(merchant_id)

- Retrieves all rules for a specific merchant
- Includes account details

#### deleteReconRule(merchant_id, rule_id)

- Validates merchant ownership using both rule_id and merchant_id
- Deletes the specified rule if it belongs to the merchant
- Handles not found errors appropriately

### 4. Validation Rules

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

### 5. Error Handling

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

## Testing Strategy

1. Unit Tests:

   - Core logic functions
   - Validation rules
   - Error handling

2. Integration Tests:

   - API endpoints
   - Database operations
   - Merchant association

3. Test Cases:
   - Successful operations
   - Invalid inputs
   - Cross-merchant access attempts
   - Duplicate rules
   - Non-existent resources

## Future Considerations

1. Performance:

   - Index optimization
   - Query optimization
   - Caching strategies

2. Security:

   - Authentication
   - Authorization
   - Rate limiting

3. Features:

   - Bulk operations
   - Rule templates
   - Rule versioning

4. Monitoring:
   - Usage metrics
   - Error tracking
   - Performance monitoring
