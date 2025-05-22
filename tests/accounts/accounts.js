// tests/accounts/accounts.js
const request = require('supertest');
const app = require('../../src/app'); // Adjust path as necessary
const prisma = require('../../src/services/prisma'); // Adjust path as necessary

describe('Account API Endpoints', () => {
  let testMerchant;

  beforeAll(async () => {
    // Create a dedicated merchant for these account tests
    // This ensures independence from merchant tests and provides a consistent merchant ID
    try {
      testMerchant = await prisma.merchantAccount.create({
        data: { merchant_id: 'acc_api_test_m001', merchant_name: 'Account API Test Merchant' },
      });
    } catch (e) {
      // In case of a previous unclean exit, the merchant might exist. Try to fetch.
      testMerchant = await prisma.merchantAccount.findUnique({ where: { merchant_id: 'acc_api_test_m001' } });
      if (!testMerchant) {
        // If it truly doesn't exist and creation failed, something is wrong with the test setup/DB.
        console.error("Failed to create or find test merchant for account tests.", e);
        throw e; 
      }
    }
  });

  afterEach(async () => {
    // Clean up any accounts created under the testMerchant to ensure test independence
    if (testMerchant) {
      try {
        await prisma.account.deleteMany({ where: { merchant_id: testMerchant.merchant_id } });
      } catch (error) {
        // console.error('Error in afterEach cleanup for accounts:', error.message);
      }
    }
  });

  afterAll(async () => {
    // Clean up the test merchant created for this suite
    if (testMerchant) {
      try {
        await prisma.merchantAccount.delete({ where: { merchant_id: testMerchant.merchant_id } });
      } catch (error) {
        // console.error('Error in afterAll cleanup for test merchant:', error.message);
      }
    }
    // Disconnect Prisma client
    await prisma.$disconnect();
  });

  describe('POST /api/merchants/:merchant_id/accounts', () => {
    it('should create a new account successfully for an existing merchant', async () => {
      const response = await request(app)
        .post(`/api/merchants/${testMerchant.merchant_id}/accounts`)
        .send({ account_name: 'Operating Account', account_type: 'DEBIT_NORMAL', currency: 'USD' });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('account_id');
      expect(response.body.merchant_id).toBe(testMerchant.merchant_id);
      expect(response.body.account_name).toBe('Operating Account');
      expect(response.body.account_type).toBe('DEBIT_NORMAL');
      expect(response.body.currency).toBe('USD');
      expect(response.body).not.toHaveProperty('created_at');
      expect(response.body).not.toHaveProperty('updated_at');

      const dbAccount = await prisma.account.findUnique({ where: { account_id: response.body.account_id } });
      expect(dbAccount).not.toBeNull();
      expect(dbAccount.account_name).toBe('Operating Account');
    });

    it('should return 400 if merchant_id does not exist', async () => {
      const response = await request(app)
        .post('/api/merchants/nonexistent_m123/accounts')
        .send({ account_name: 'Ghost Account', account_type: 'CREDIT_NORMAL', currency: 'JPY' });
      
      expect(response.statusCode).toBe(400); // As per current route error handling
      expect(response.body.error).toContain('Merchant with ID nonexistent_m123 not found');
    });

    it('should return 400 for missing account_name', async () => {
      const response = await request(app)
        .post(`/api/merchants/${testMerchant.merchant_id}/accounts`)
        .send({ account_type: 'DEBIT_NORMAL', currency: 'USD' }); // account_name missing
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid account_type', async () => {
        const response = await request(app)
          .post(`/api/merchants/${testMerchant.merchant_id}/accounts`)
          .send({ account_name: 'Invalid Type Acc', account_type: 'INVALID_TYPE', currency: 'CAD' });
        
        // This depends on Prisma validation for enums. Prisma typically throws an error that leads to a generic server error
        // if not specifically handled. The core logic now throws "Invalid input for account creation..."
        // which the route handler maps to a 400.
        expect(response.statusCode).toBe(400); 
        expect(response.body.error).toMatch(/Invalid input for account creation. Details:.*AccountType/); 
      });
  });

  describe('GET /api/merchants/:merchant_id/accounts', () => {
    it('should return an empty list if no accounts exist for the merchant', async () => {
      const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/accounts`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return a list of accounts for the merchant', async () => {
      await prisma.account.create({
        data: { 
          account_name: 'Savings EUR', 
          account_type: 'DEBIT_NORMAL', 
          currency: 'EUR', 
          merchant_id: testMerchant.merchant_id 
        }
      });
      await prisma.account.create({
        data: { 
          account_name: 'Checking USD', 
          account_type: 'DEBIT_NORMAL', 
          currency: 'USD', 
          merchant_id: testMerchant.merchant_id 
        }
      });

      const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/accounts`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ account_name: 'Savings EUR', currency: 'EUR', posted_balance: '0.00' }),
          expect.objectContaining({ account_name: 'Checking USD', currency: 'USD', pending_balance: '0.00' }),
        ])
      );
    });
  });

  describe('PUT /api/merchants/:merchant_id/accounts/:account_id', () => {
    let existingAccount;
    let originalUpdatedAt;

    beforeEach(async () => {
      const createdAccount = await prisma.account.create({
        data: {
          account_name: 'Initial Account Name',
          account_type: 'DEBIT_NORMAL',
          currency: 'USD',
          merchant_id: testMerchant.merchant_id,
        },
      });
      // Fetch fresh to get accurate DB-generated timestamps
      existingAccount = await prisma.account.findUnique({ where: { account_id: createdAccount.account_id } });
      originalUpdatedAt = existingAccount.updated_at;
    });

    it('should update an account name successfully', async () => {
      const newAccountName = 'Updated Account Name';
      const response = await request(app)
        .put(`/api/merchants/${testMerchant.merchant_id}/accounts/${existingAccount.account_id}`)
        .send({ account_name: newAccountName });

      expect(response.statusCode).toBe(200);
      expect(response.body.account_id).toBe(existingAccount.account_id);
      expect(response.body.merchant_id).toBe(testMerchant.merchant_id);
      expect(response.body.account_name).toBe(newAccountName);
      expect(response.body.account_type).toBe(existingAccount.account_type);
      expect(response.body.currency).toBe(existingAccount.currency);
      expect(response.body).not.toHaveProperty('created_at');
      expect(response.body).not.toHaveProperty('updated_at');

      const dbAccount = await prisma.account.findUnique({ where: { account_id: existingAccount.account_id } });
      expect(dbAccount).not.toBeNull();
      expect(dbAccount.account_name).toBe(newAccountName);
      expect(dbAccount.updated_at.toISOString()).not.toBe(originalUpdatedAt.toISOString());
    });

    it('should ignore attempts to update immutable fields like currency', async () => {
      const newAccountName = 'Name Change Only';
      const attemptedNewCurrency = 'EUR';
      const response = await request(app)
        .put(`/api/merchants/${testMerchant.merchant_id}/accounts/${existingAccount.account_id}`)
        .send({ account_name: newAccountName, currency: attemptedNewCurrency });

      expect(response.statusCode).toBe(200);
      expect(response.body.account_name).toBe(newAccountName);
      expect(response.body.currency).toBe(existingAccount.currency); // Currency should remain USD

      const dbAccount = await prisma.account.findUnique({ where: { account_id: existingAccount.account_id } });
      expect(dbAccount.currency).toBe(existingAccount.currency);
      expect(dbAccount.account_name).toBe(newAccountName);
      expect(dbAccount.updated_at.toISOString()).not.toBe(originalUpdatedAt.toISOString());
    });
    
    it('should return 400 for invalid payload (e.g., empty account_name)', async () => {
      const response = await request(app)
        .put(`/api/merchants/${testMerchant.merchant_id}/accounts/${existingAccount.account_id}`)
        .send({ account_name: '' }); 

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toMatch(/Missing or invalid required field: account_name \(must be a non-empty string\)/i);


      const dbAccount = await prisma.account.findUnique({ where: { account_id: existingAccount.account_id } });
      expect(dbAccount.account_name).toBe(existingAccount.account_name);
      expect(dbAccount.updated_at.toISOString()).toBe(originalUpdatedAt.toISOString());
    });

    it('should return 404 if account_id does not exist', async () => {
      const nonExistentAccountId = 'acc_nonexistent_uuid_put';
      const response = await request(app)
        .put(`/api/merchants/${testMerchant.merchant_id}/accounts/${nonExistentAccountId}`)
        .send({ account_name: 'Trying to update ghost' });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain(`Account with ID ${nonExistentAccountId} not found`);
    });

    it('should return 404 if merchant_id in URL does not exist', async () => {
      const nonExistentMerchantId = 'm_ghost_put_007';
      const response = await request(app)
        .put(`/api/merchants/${nonExistentMerchantId}/accounts/${existingAccount.account_id}`)
        .send({ account_name: 'Trying with ghost merchant' });
      
      expect(response.statusCode).toBe(404); 
      // If the merchant doesn't exist, an account cannot belong to it.
      // The core logic might first check merchant existence or try to fetch account scoped to merchant.
      // The actual error "Account ... does not belong to merchant ..." is reasonable.
      expect(response.body.error).toContain(`Account with ID ${existingAccount.account_id} does not belong to merchant ${nonExistentMerchantId}.`);
    });

    it('should return 404 if account belongs to a different merchant', async () => {
      const otherMerchant = await prisma.merchantAccount.create({
        data: { merchant_id: 'acc_api_other_m003_put', merchant_name: 'Other Test Merchant For PUT' },
      });

      const response = await request(app)
        .put(`/api/merchants/${otherMerchant.merchant_id}/accounts/${existingAccount.account_id}`)
        .send({ account_name: 'Cross-merchant update attempt' });

      expect(response.statusCode).toBe(404);
      // Consistent with DELETE test error message structure, adding the period.
      expect(response.body.error).toContain(`Account with ID ${existingAccount.account_id} does not belong to merchant ${otherMerchant.merchant_id}.`);
      
      await prisma.merchantAccount.delete({ where: { merchant_id: otherMerchant.merchant_id } });
      
      const dbAccount = await prisma.account.findUnique({ where: { account_id: existingAccount.account_id } });
      expect(dbAccount.account_name).toBe(existingAccount.account_name);
      expect(dbAccount.updated_at.toISOString()).toBe(originalUpdatedAt.toISOString());
    });
  });

  describe('DELETE /api/merchants/:merchant_id/accounts/:account_id', () => {
    let accountToDelete;
    beforeEach(async () => { // Create a fresh account before each DELETE test
      accountToDelete = await prisma.account.create({
        data: { 
          account_name: 'Account To Be Deleted', 
          account_type: 'CREDIT_NORMAL', 
          currency: 'GBP', 
          merchant_id: testMerchant.merchant_id 
        }
      });
    });

    it('should delete an account successfully', async () => {
      const response = await request(app)
        .delete(`/api/merchants/${testMerchant.merchant_id}/accounts/${accountToDelete.account_id}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.account_id).toBe(accountToDelete.account_id);

      const dbAccount = await prisma.account.findUnique({ where: { account_id: accountToDelete.account_id } });
      expect(dbAccount).toBeNull();
    });

    it('should return 404 if account_id does not exist', async () => {
      const response = await request(app)
        .delete(`/api/merchants/${testMerchant.merchant_id}/accounts/nonexistent-uuid-format`);
      
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain('Account with ID nonexistent-uuid-format not found');
    });

    it('should return 404 if account belongs to a different merchant', async () => {
      // Create a temporary "other" merchant
      const otherMerchant = await prisma.merchantAccount.create({
        data: { merchant_id: 'acc_api_other_m002', merchant_name: 'Other Test Merchant' },
      });

      const response = await request(app)
        .delete(`/api/merchants/${otherMerchant.merchant_id}/accounts/${accountToDelete.account_id}`);
      
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain(`does not belong to merchant ${otherMerchant.merchant_id}`);

      // Clean up otherMerchant
      await prisma.merchantAccount.delete({ where: { merchant_id: otherMerchant.merchant_id } });
    });
  });
});
