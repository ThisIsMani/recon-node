# Plan: Implement Test Cases for Merchant-Associated Recon Rules (2025-05-20)

## Overall Goal

- Implement comprehensive test coverage for merchant-associated recon rules
- Ensure proper validation and error handling
- Verify data isolation between merchants
- Fix failing tests and improve error handling

## Prerequisites

- Test database setup
- Jest and Supertest configured
- Test merchants and accounts created
- Proper error handling middleware

## Steps

| Done | #   | Action                  | Detail                                                                                             |
| ---- | --- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| [ ]  | 1   | Fix Merchant Validation | Move merchant validation before route matching to return 400 instead of 404 for invalid merchants. |
| [ ]  | 2   | Update Error Handling   | Implement proper error handling for P2025 (Record not found) in delete operation.                  |
| [ ]  | 3   | Fix Test Cases          | Update test cases to match expected behavior and improve coverage.                                 |
| [ ]  | 4   | Add Integration Tests   | Add tests for cross-merchant scenarios and edge cases.                                             |
| [ ]  | 5   | Improve Test Coverage   | Add tests for untested code paths in core logic.                                                   |

## Test Implementation Details

### 1. Setup and Teardown

```javascript
beforeAll(async () => {
  // Create test merchants
  merchant1 = await createTestMerchant();
  merchant2 = await createTestMerchant();

  // Create test accounts
  account1_m1 = await createTestAccount(merchant1.merchant_id);
  account2_m1 = await createTestAccount(merchant1.merchant_id);
  account1_m2 = await createTestAccount(merchant2.merchant_id);
});

afterEach(async () => {
  // Clean up test data
  await prisma.reconRule.deleteMany();
});

afterAll(async () => {
  // Clean up all test data
  await prisma.reconRule.deleteMany();
  await prisma.account.deleteMany();
  await prisma.merchantAccount.deleteMany();
});
```

### 2. Test Cases

#### POST /merchants/{merchant_id}/recon-rules

| Test Case              | Expected Status | Expected Response                     |
| ---------------------- | --------------- | ------------------------------------- |
| Success                | 201             | Created rule with merchant_id         |
| Invalid Merchant       | 400             | "Merchant not found"                  |
| Cross-Merchant Account | 400             | "Account does not belong to merchant" |
| Missing Account        | 400             | "account_one_id is required"          |
| Same Account           | 400             | "Accounts must be different"          |
| Duplicate Rule         | 400             | "Rule already exists"                 |

#### GET /merchants/{merchant_id}/recon-rules

| Test Case        | Expected Status | Expected Response           |
| ---------------- | --------------- | --------------------------- |
| Empty List       | 200             | []                          |
| Merchant Rules   | 200             | Array of rules for merchant |
| Invalid Merchant | 400             | "Merchant not found"        |

#### DELETE /merchants/{merchant_id}/recon-rules/{rule_id}

| Test Case           | Expected Status | Expected Response                  |
| ------------------- | --------------- | ---------------------------------- |
| Success             | 200             | Deleted rule                       |
| Non-existent Rule   | 404             | "Rule not found"                   |
| Cross-Merchant Rule | 404             | "Rule does not belong to merchant" |
| Invalid Merchant    | 400             | "Merchant not found"               |

### 3. Test Coverage Areas

1. Merchant Validation:

   - Valid merchant ID
   - Invalid merchant ID
     | Non-existent merchant

2. Account Validation:

   - Valid account ownership
   - Cross-merchant accounts
   - Non-existent accounts
   - Same account validation

3. Rule Management:

   - Rule creation
   - Rule listing
   - Rule deletion
   - Duplicate rule prevention

4. Error Handling:

   - Validation errors (400)
   - Not found errors (404)
   - Server errors (500)
   - P2025 error handling

5. Data Isolation:
   - Cross-merchant access prevention
   - Merchant-specific rule listing
   - Merchant-specific rule deletion

## Implementation Notes

1. Fix Merchant Validation:

```javascript
// Move merchant validation before route matching
const validateMerchant = async (req, res, next) => {
  const merchant = await prisma.merchantAccount.findUnique({
    where: { merchant_id: req.params.merchant_id },
  });
  if (!merchant) {
    return res.status(400).json({ error: "Merchant not found" });
  }
  next();
};
```

2. Update Error Handling:

```javascript
// In deleteReconRule function
const deletedRule = await prisma.reconRule
  .delete({
    where: {
      id: rule_id,
      merchant_id: merchant_id,
    },
  })
  .catch((error) => {
    if (error.code === "P2025") {
      throw new Error("Rule not found or does not belong to merchant");
    }
    throw error;
  });
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/recon-rules/recon-rules.js

# Run tests with coverage
npm test -- --coverage
```

## Dependencies

- jest
- supertest
- @prisma/client
- express

## Future Enhancements

1. Performance Testing:

   - Load testing with multiple merchants
   - Concurrent rule operations
   - Database query optimization

2. Security Testing:

   - Authentication
   - Authorization
   - Rate limiting

3. Integration Testing:
   - End-to-end workflows
   - Cross-service interactions
   - Error recovery scenarios
