# Plan: Implement Merchant Association for Recon Rules (2025-05-20)

This plan outlines the implementation of merchant association for the Recon Rules API, ensuring proper data isolation and merchant-specific rule management.

## Overall Goal

- Associate recon rules with merchants
- Implement proper validation for merchant-owned accounts
- Add delete functionality for recon rules
- Ensure proper error handling and security

## Completed Steps

| Done | #   | Action                   | Detail                                                                                         |
| ---- | --- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| [x]  | 1   | Update Prisma Schema     | Added `merchant_id` field to `ReconRule` model and established relation with `MerchantAccount` |
| [x]  | 2   | Create Migration         | Generated and applied migration for adding merchant association to recon rules                 |
| [x]  | 3   | Update Core Logic        | Modified `createReconRule` to validate merchant ownership of accounts                          |
| [x]  | 4   | Add Delete Functionality | Implemented `deleteReconRule` with merchant validation                                         |
| [x]  | 5   | Update API Routes        | Modified routes to be nested under merchants and added DELETE endpoint                         |
| [x]  | 6   | Update Tests             | Added tests for merchant validation and delete functionality                                   |
| [x]  | 7   | Update Documentation     | Updated Swagger docs and memory bank with merchant association details                         |

## Implementation Details

### Schema Changes

```prisma
model ReconRule {
  id               String   @id @default(cuid())
  merchant_id      String   @db.VarChar(255)  // Added field
  account_one_id   String
  account_two_id   String
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  merchant         MerchantAccount @relation(fields: [merchant_id], references: [merchant_id])  // Added relation
  accountOne       Account  @relation("ReconRuleAccountOne", fields: [account_one_id], references: [account_id])
  accountTwo       Account  @relation("ReconRuleAccountTwo", fields: [account_two_id], references: [account_id])

  @@unique([account_one_id, account_two_id], name: "unique_recon_rule_pair")
  @@index([account_one_id])
  @@index([account_two_id])
  @@index([merchant_id])  // Added index
}
```

### API Changes

- Routes now nested under merchants:
  - `POST /merchants/{merchant_id}/recon-rules`
  - `GET /merchants/{merchant_id}/recon-rules`
  - `DELETE /merchants/{merchant_id}/recon-rules/{rule_id}`

### Core Logic Updates

1. `createReconRule`:

   - Added merchant validation
   - Ensures accounts belong to the merchant
   - Prevents cross-merchant rule creation

2. `listReconRules`:

   - Now scoped to merchant
   - Returns only rules belonging to the specified merchant

3. `deleteReconRule`:
   - Added with merchant validation
   - Ensures rules can only be deleted by their merchant
   - Returns 404 if rule not found or doesn't belong to merchant

### Validation Rules

1. Merchant Validation:

   - Merchant must exist
   - Accounts must belong to the merchant
   - Rules are scoped to merchant

2. Account Validation:

   - Both accounts must exist
   - Accounts must be different
   - Accounts must belong to the same merchant

3. Rule Validation:
   - No duplicate rules for same account pair
   - Rules can only be managed by their merchant

## Security Considerations

1. Data Isolation:

   - Rules are strictly scoped to merchants
   - No cross-merchant access allowed
   - Merchant validation on all operations

2. Error Handling:
   - Proper error messages for validation failures
   - Secure error responses without exposing internals
   - Consistent error format across endpoints

## Future Enhancements

1. Rule Management:

   - Bulk operations for rule management
   - Rule templates for common patterns
   - Rule versioning and history

2. Performance:

   - Caching for frequently accessed rules
   - Batch operations for rule creation
   - Optimized queries for rule lookups

3. Monitoring:

   - Rule usage tracking
   - Performance metrics
   - Error rate monitoring

4. Integration:
   - Webhook support for rule changes
   - Event system for rule updates
   - Integration with recon engine
